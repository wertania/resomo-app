/**
 * Realtime audio transcription using Mistral Voxtral via WebSocket.
 *
 * This module bridges a client-facing WebSocket (Bun/Hono) to
 * Mistral's Realtime Transcription WebSocket API.
 *
 * Flow:
 *  Browser mic → (PCM chunks over WS) → this proxy → Mistral Realtime WS
 *  Mistral Realtime WS → (transcription events) → this proxy → Browser
 */

import {
  RealtimeTranscription,
  type RealtimeEvent,
} from "@mistralai/mistralai/extra/realtime";
import { log } from "../../../../framework/src";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const REALTIME_MODEL = "voxtral-mini-transcribe-realtime-2602";

/**
 * Manages a single realtime transcription session.
 * Created per WebSocket connection from the client.
 */
export class RealtimeTranscriptionSession {
  private connection: Awaited<
    ReturnType<RealtimeTranscription["connect"]>
  > | null = null;
  private closed = false;

  // Callback to send transcription events back to the client
  private onEvent: (event: RealtimeEvent) => void;
  private onError: (error: Error) => void;
  private onDone: () => void;

  constructor(handlers: {
    onEvent: (event: RealtimeEvent) => void;
    onError: (error: Error) => void;
    onDone: () => void;
  }) {
    this.onEvent = handlers.onEvent;
    this.onError = handlers.onError;
    this.onDone = handlers.onDone;
  }

  /**
   * Connect to Mistral's realtime transcription API
   */
  async start(): Promise<void> {
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    try {
      // Create realtime transcription client from the SDK extras
      const realtime = new RealtimeTranscription({
        apiKey: MISTRAL_API_KEY,
      });

      log.info(
        `Connecting to Mistral Realtime Transcription with model ${REALTIME_MODEL}...`
      );

      this.connection = await realtime.connect(REALTIME_MODEL, {
        audioFormat: {
          encoding: "pcm_s16le",
          sampleRate: 16000,
        },
      });

      log.info(
        `Connected to Mistral Realtime Transcription. Session: ${this.connection.requestId}`
      );

      // Start listening for events from Mistral in background
      this.listenForEvents();
    } catch (error) {
      log.error("Failed to connect to Mistral Realtime:", String(error));
      this.onError(error as Error);
    }
  }

  /**
   * Send audio data to Mistral
   */
  async sendAudio(audioData: Uint8Array): Promise<void> {
    if (this.closed || !this.connection) {
      return;
    }

    try {
      await this.connection.sendAudio(audioData);
    } catch (error) {
      log.error("Error sending audio to Mistral:", String(error));
      this.onError(error as Error);
    }
  }

  /**
   * Signal end of audio input
   */
  async endAudio(): Promise<void> {
    if (this.closed || !this.connection) {
      return;
    }

    try {
      await this.connection.endAudio();
    } catch (error) {
      log.error("Error ending audio:", String(error));
    }
  }

  /**
   * Close the session
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        log.error("Error closing Mistral connection:", String(error));
      }
      this.connection = null;
    }
  }

  /**
   * Listen for transcription events from Mistral and forward them
   */
  private async listenForEvents(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      for await (const event of this.connection) {
        if (this.closed) {
          break;
        }

        this.onEvent(event);

        if (event.type === "transcription.done") {
          this.onDone();
          break;
        }

        if (event.type === "error") {
          log.error("Mistral Realtime error event:", event);
          break;
        }
      }
    } catch (error) {
      if (!this.closed) {
        log.error("Error in Mistral event listener:", String(error));
        this.onError(error as Error);
      }
    }
  }
}
