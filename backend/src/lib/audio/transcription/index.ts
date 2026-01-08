import { Mistral } from "@mistralai/mistralai";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
}

/**
 * Transcribe audio using Mistral's voxtral-mini model
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<TranscriptionResult> {
  if (!MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is not configured");
  }

  const client = new Mistral({ apiKey: MISTRAL_API_KEY });
  const mimeType = getMimeType(fileName);

  // Create a File object from the buffer (Bun supports this)
  const audioFile = new File([audioBuffer], fileName, { type: mimeType });

  // Transcribe the audio file
  const response = await client.audio.transcriptions.complete({
    model: "voxtral-mini-latest",
    file: audioFile,
    timestampGranularities: ["segment"],
  });

  const segments: TranscriptionSegment[] | undefined = response.segments?.map(
    (seg: { start?: number; end?: number; text?: string }) => ({
      start: seg.start || 0,
      end: seg.end || 0,
      text: seg.text || "",
    })
  );

  return {
    text: response.text || "",
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
