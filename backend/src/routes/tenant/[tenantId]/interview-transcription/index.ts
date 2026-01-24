/**
 * Routes for interview audio transcription using ElevenLabs Scribe v2
 */

import type { FastAppHono } from "@framework/types";
import { HTTPException } from "hono/http-exception";
import {
  authAndSetUsersInfo,
  checkUserPermission,
} from "@framework/lib/utils/hono-middlewares";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { startTranscription } from "../../../../lib/elevenlabs";
import { saveFileToDb } from "@framework/lib/storage/db";
import {
  createInterviewSession,
  getInterviewSessionById,
  updateInterviewSessionTranscriptionStatus,
  updateInterviewSessionTranscript,
} from "../../../../lib/interview-sessions";
import { interviewSessionsSelectSchema } from "../../../../db/tables/interview-sessions";
import log from "@framework/lib/log";

/**
 * Process transcription asynchronously for an interview session
 */
async function processTranscriptionForSession(
  sessionId: string,
  tenantId: string,
  elevenlabsTranscriptionId: string
): Promise<void> {
  // Update status to processing
  await updateInterviewSessionTranscriptionStatus(
    sessionId,
    tenantId,
    "processing",
    elevenlabsTranscriptionId
  );

  try {
    const { pollTranscriptionStatus } = await import("../../../../lib/elevenlabs");

    log.debug(
      `[transcription] Starting polling for session ${sessionId} (ElevenLabs ID: ${elevenlabsTranscriptionId})`
    );

    const result = await pollTranscriptionStatus(elevenlabsTranscriptionId);

    // Calculate duration from segments
    const duration =
      result.segments.length > 0
        ? Math.max(...result.segments.map((s) => s.endTime || s.startTime))
        : undefined;

    // Update session with completed transcript
    await updateInterviewSessionTranscript(
      sessionId,
      tenantId,
      result,
      duration,
      "completed"
    );

    log.debug(
      `[transcription] Completed transcription for session ${sessionId} with ${result.segments.length} segments`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    log.error(
      `[transcription] Error processing transcription for session ${sessionId} (ElevenLabs ID: ${elevenlabsTranscriptionId}): ${errorMessage}`,
      errorDetails
    );

    await updateInterviewSessionTranscriptionStatus(
      sessionId,
      tenantId,
      "error",
      elevenlabsTranscriptionId,
      errorMessage
    );
  }
}

/**
 * Define interview transcription routes
 */
export default function defineInterviewTranscriptionRoutes(
  app: FastAppHono,
  API_BASE_PATH: string = ""
) {
  const baseRoute = `${API_BASE_PATH}/tenant/:tenantId/interview-transcription`;

  /**
   * POST /tenant/:tenantId/interview-transcription
   * Upload audio file, create interview session, and start async transcription
   * Body: FormData with 'audio' file, 'name' (string), 'description' (optional string)
   * Returns: { interviewSessionId: string }
   */
  app.post(
    baseRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-transcription"],
      summary: "Upload audio file and start async transcription",
      responses: {
        200: {
          description: "Interview session created and transcription started",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  interviewSessionId: v.string(),
                })
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    async (c) => {
      try {
        const { tenantId } = c.req.valid("param");
        const formData = await c.req.formData();
        const audioFile = formData.get("audio") as File | null;
        const name = formData.get("name") as string | null;
        const description = formData.get("description") as string | null;

        if (!audioFile) {
          throw new HTTPException(400, {
            message: "No audio file provided",
          });
        }

        if (!name) {
          throw new HTTPException(400, {
            message: "Name is required",
          });
        }

        // Step 1: Upload file to database storage
        const fileResult = await saveFileToDb(
          audioFile,
          "interview-audio",
          tenantId
        );

        // Step 2: Create interview session FIRST with pending status
        // This ensures we have a DB entry even if ElevenLabs fails
        const session = await createInterviewSession(tenantId, {
          fileId: fileResult.id,
          name,
          description: description || undefined,
          meta: {
            transcriptionStatus: "pending",
          },
        });

        log.debug(
          `[transcription] Created interview session ${session.id} with pending status`
        );

        // Return response IMMEDIATELY - DB entry is already created
        // Frontend can see the session right away, even while ElevenLabs is starting
        const response = c.json({
          interviewSessionId: session.id,
        });

        // Step 3: Start transcription with ElevenLabs (async, don't block response)
        // This runs in the background after the response is sent
        // We need to keep a reference to audioFile data since we can't await after response
        const audioFileData = {
          arrayBuffer: audioFile.arrayBuffer(),
          name: audioFile.name,
        };

        (async () => {
          try {
            const arrayBuffer = await audioFileData.arrayBuffer;
            const buffer = Buffer.from(arrayBuffer);
            
            const elevenlabsTranscriptionId = await startTranscription(
              buffer,
              audioFileData.name
            );
            
            // Update session with ElevenLabs ID
            await updateInterviewSessionTranscriptionStatus(
              session.id,
              tenantId,
              "pending",
              elevenlabsTranscriptionId
            );
            
            log.debug(
              `[transcription] Started ElevenLabs transcription ${elevenlabsTranscriptionId} for session ${session.id}`
            );

            // Step 4: Start async processing (don't await)
            processTranscriptionForSession(
              session.id,
              tenantId,
              elevenlabsTranscriptionId
            ).catch((error) => {
              log.error(
                `[transcription] Failed to process transcription for session ${session.id}:`,
                error
              );
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log.error(
              `[transcription] Failed to start ElevenLabs transcription for session ${session.id}: ${errorMessage}`
            );
            
            // Update session with error status
            await updateInterviewSessionTranscriptionStatus(
              session.id,
              tenantId,
              "error",
              undefined,
              `Failed to start transcription: ${errorMessage}`
            );
          }
        })().catch((error) => {
          log.error(
            `[transcription] Unexpected error in async ElevenLabs processing for session ${session.id}:`,
            error
          );
        });

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorDetails = error instanceof Error ? error.stack : String(error);
        log.error(`[transcription] Interview transcription error: ${errorMessage}`, errorDetails);
        throw new HTTPException(500, {
          message: `Failed to start transcription: ${errorMessage}`,
        });
      }
    }
  );

  /**
   * GET /tenant/:tenantId/interview-transcription/:interviewSessionId/status
   * Get transcription status for an interview session
   * Returns: Interview session with current transcription status
   */
  app.get(
    `${baseRoute}/:interviewSessionId/status`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-transcription"],
      summary: "Get transcription status for interview session",
      responses: {
        200: {
          description: "Interview session with transcription status",
          content: {
            "application/json": {
              schema: resolver(interviewSessionsSelectSchema),
            },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ tenantId: v.string(), interviewSessionId: v.string() })
    ),
    async (c) => {
      try {
        const { tenantId, interviewSessionId } = c.req.valid("param");
        const session = await getInterviewSessionById(
          interviewSessionId,
          tenantId
        );

        if (!session) {
          throw new HTTPException(404, {
            message: "Interview session not found",
          });
        }

        return c.json(session);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: `Failed to get transcription status: ${(error as Error).message}`,
        });
      }
    }
  );
}
