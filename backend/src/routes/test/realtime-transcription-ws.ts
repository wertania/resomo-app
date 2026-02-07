/**
 * WebSocket route for realtime audio transcription.
 *
 * Endpoint: GET /ws/realtime-transcription
 *
 * Protocol:
 *  Client → Server:
 *    - Binary frames: raw PCM audio data (16-bit signed LE, 16kHz, mono)
 *    - JSON text: { type: "end" } to signal end of audio
 *    - JSON text: { type: "close" } to close the session
 *
 *  Server → Client:
 *    - JSON text: transcription events from Mistral
 *      - { type: "session.created", ... }
 *      - { type: "transcription.text.delta", text: "..." }
 *      - { type: "transcription.segment", ... }
 *      - { type: "transcription.done", ... }
 *      - { type: "error", error: { message: "..." } }
 */

import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import { RealtimeTranscriptionSession } from "../../lib/audio/realtime-transcription";

/**
 * Define the WebSocket route for realtime transcription
 */
export function defineRealtimeTranscriptionWsRoute(
  app: Hono<any>,
  upgradeWebSocket: UpgradeWebSocket<any>
) {
  app.get(
    "/ws/realtime-transcription",
    upgradeWebSocket((c) => {
      let session: RealtimeTranscriptionSession | null = null;

      return {
        onOpen: async (_event, ws) => {
          console.log("[RealtimeTranscription] Client connected");

          session = new RealtimeTranscriptionSession({
            onEvent: (event) => {
              try {
                // Forward Mistral events to the client as JSON
                ws.send(JSON.stringify(event));
              } catch (err) {
                console.error(
                  "[RealtimeTranscription] Error sending event to client:",
                  err
                );
              }
            },
            onError: (error) => {
              try {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    error: { message: error.message },
                  })
                );
              } catch (err) {
                // Client might already be disconnected
              }
            },
            onDone: () => {
              console.log("[RealtimeTranscription] Transcription done");
              try {
                ws.send(
                  JSON.stringify({
                    type: "transcription.done",
                  })
                );
              } catch (err) {
                // Client might already be disconnected
              }
            },
          });

          try {
            await session.start();
            ws.send(
              JSON.stringify({
                type: "ready",
                message: "Connected to Mistral Realtime Transcription",
              })
            );
          } catch (error) {
            console.error(
              "[RealtimeTranscription] Failed to start session:",
              error
            );
            ws.send(
              JSON.stringify({
                type: "error",
                error: {
                  message: `Failed to start transcription: ${(error as Error).message}`,
                },
              })
            );
            ws.close(1011, "Failed to start transcription session");
          }
        },

        onMessage: async (event, ws) => {
          if (!session) {
            return;
          }

          const data = event.data;

          // Binary data = audio chunk
          if (data instanceof ArrayBuffer) {
            await session.sendAudio(new Uint8Array(data));
            return;
          }

          // Handle Blob (some WebSocket implementations send Blob)
          if (typeof Blob !== "undefined" && data instanceof Blob) {
            const arrayBuffer = await data.arrayBuffer();
            await session.sendAudio(new Uint8Array(arrayBuffer));
            return;
          }

          // Text data = control messages
          if (typeof data === "string") {
            try {
              const msg = JSON.parse(data);
              if (msg.type === "end") {
                await session.endAudio();
              } else if (msg.type === "close") {
                await session.close();
                ws.close(1000, "Client requested close");
              }
            } catch {
              console.warn(
                "[RealtimeTranscription] Invalid text message:",
                data
              );
            }
          }
        },

        onClose: async () => {
          console.log("[RealtimeTranscription] Client disconnected");
          if (session) {
            await session.close();
            session = null;
          }
        },

        onError: (event) => {
          console.error("[RealtimeTranscription] WebSocket error:", event);
        },
      };
    })
  );
}
