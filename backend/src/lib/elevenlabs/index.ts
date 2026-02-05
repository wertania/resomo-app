/**
 * ElevenLabs API client for transcription services
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import log from "@framework/lib/log";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.warn("ELEVENLABS_API_KEY is not configured");
}

const elevenlabsClient = ELEVENLABS_API_KEY
  ? new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
    environment: "https://api.elevenlabs.io",
  })
  : null;

/**
 * Start transcription using ElevenLabs Scribe v2
 * @param audioBuffer - Audio file buffer
 * @param fileName - Original file name
 * @returns ElevenLabs transcription ID
 */
export async function startTranscription(
  audioBuffer: Buffer,
  fileName: string
): Promise<string> {
  if (!elevenlabsClient) {
    throw new Error("ElevenLabs API key is not configured");
  }

  // Create a File object from the buffer (Bun supports this)
  const audioFile = new File([audioBuffer], fileName, {
    type: getMimeType(fileName),
  });

  // Start transcription using Scribe v2 (returns transcription ID)
  const convertResult = await elevenlabsClient.speechToText.convert({
    modelId: "scribe_v2",
    file: audioFile,
    languageCode: "de",
    // numSpeakers: 2,
    diarize: true,
    timestampsGranularity: "word",
  });

  const transcriptionId =
    (convertResult as any).transcriptionId ||
    (convertResult as any).transcription_id;
  if (!transcriptionId) {
    throw new Error("Failed to get transcription ID from convert response");
  }

  return transcriptionId;
}

/**
 * Poll transcription status and return result when completed
 * @param elevenlabsTranscriptionId - ElevenLabs transcription ID
 * @returns Transcription result with segments and speaker recognition
 */
export async function pollTranscriptionStatus(
  elevenlabsTranscriptionId: string
): Promise<{
  language: string;
  segments: Array<{
    text: string;
    startTime: number;
    endTime?: number;
    speaker: { name: string; id: string };
    words?: Array<{
      text: string;
      startTime: number;
      endTime?: number;
    }>;
  }>;
}> {
  if (!elevenlabsClient) {
    throw new Error("ElevenLabs API key is not configured");
  }

  // Poll for transcription completion
  let transcription: any;
  let attempts = 0;
  const maxAttempts = 200; // ~50 minutes max (200 * 15 seconds)
  const pollInterval = 15000; // 15 seconds

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    log.debug(
      `[elevenlabs] Polling transcription status (attempt ${attempts + 1}/${maxAttempts}) for ID: ${elevenlabsTranscriptionId}`
    );

    try {
      transcription = await elevenlabsClient.speechToText.transcripts.get(
        elevenlabsTranscriptionId
      );

      log.debug(
        `[elevenlabs] Transcription response: has text=${!!transcription.text}, has words=${!!transcription.words}`
      );

      // Log the full transcription result for debugging
      log.debug(`[elevenlabs] Full transcription result: ${JSON.stringify(transcription, null, 2)}`);

      // Check if transcription is complete: if text or words are present, it's done
      if (transcription.text || (transcription.words && transcription.words.length > 0)) {
        log.debug(`[elevenlabs] Transcription completed`);
        break;
      }
    } catch (error) {
      // If we get an error, it might mean the transcription is still processing
      // or there's an actual error - log it but continue polling
      log.debug(
        `[elevenlabs] Error polling transcription (attempt ${attempts + 1}): ${error instanceof Error ? error.message : "Unknown error"}`
      );

      // If it's a clear error (not just "not ready yet"), we might want to throw
      // But for now, we'll continue polling
    }

    attempts++;
  }

  // Check if we have a completed transcription
  if (!transcription || (!transcription.text && (!transcription.words || transcription.words.length === 0))) {
    throw new Error(
      `Transcription timeout: transcription not completed after ${maxAttempts} attempts`
    );
  }

  // Convert snake_case response to camelCase structure
  const language =
    transcription.languageCode ||
    transcription.language_code ||
    transcription.language ||
    "unknown";

  // Process words into segments with speaker diarization
  const segments: Array<{
    text: string;
    startTime: number;
    endTime?: number;
    speaker: { name: string; id: string };
    words?: Array<{
      text: string;
      startTime: number;
      endTime?: number;
    }>;
  }> = [];

  const words = transcription.words || [];
  if (words.length > 0) {
    // Create segments chronologically - new segment on each speaker change
    let currentSegmentWords: Array<{
      text: string;
      startTime: number;
      endTime?: number;
    }> = [];
    let currentSpeakerId: string | null = null;

    const flushSegment = () => {
      if (currentSegmentWords.length === 0 || currentSpeakerId === null) return;

      const segmentText = currentSegmentWords.map((w) => w.text).join(" ");
      const firstWord = currentSegmentWords[0];
      const lastWord = currentSegmentWords[currentSegmentWords.length - 1];

      segments.push({
        text: segmentText,
        startTime: firstWord?.startTime || 0,
        endTime: lastWord?.endTime,
        speaker: {
          name: `Speaker ${currentSpeakerId}`,
          id: currentSpeakerId,
        },
        words: currentSegmentWords.map((w) => ({
          text: w.text,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      });

      currentSegmentWords = [];
    };

    words.forEach((word: any) => {
      const speakerId = word.speakerId || word.speaker_id || "unknown";
      const wordData = {
        text: word.word || word.text || "",
        startTime: word.startTime || word.start_time || 0,
        endTime: word.endTime || word.end_time,
      };

      // If speaker changed, flush current segment and start new one
      if (currentSpeakerId !== null && speakerId !== currentSpeakerId) {
        flushSegment();
      }

      currentSpeakerId = speakerId;
      currentSegmentWords.push(wordData);
    });

    // Flush the last segment
    flushSegment();
  } else if (transcription.text) {
    // Fallback: if no word-level data, create a single segment
    segments.push({
      text: transcription.text,
      startTime: 0,
      speaker: {
        name: "Speaker 1",
        id: "1",
      },
    });
  }

  return {
    language,
    segments,
  };
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
  };
  return mimeTypes[ext || ""] || "audio/webm";
}
