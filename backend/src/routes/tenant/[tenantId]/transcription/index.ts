/**
 * Routes for audio transcription using Mistral voxtral-mini
 */

import type { FastAppHono } from "@framework/types";
import { HTTPException } from "hono/http-exception";
import {
  authAndSetUsersInfo,
  checkUserPermission,
} from "@framework/lib/utils/hono-middlewares";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi";
import * as v from "valibot";
import { transcribeAudio } from "../../../../lib/audio/transcription";

/**
 * Define transcription routes
 */
export default function defineTranscriptionRoutes(
  app: FastAppHono,
  API_BASE_PATH: string = ""
) {
  const baseRoute = `${API_BASE_PATH}/tenant/:tenantId/transcription`;

  /**
   * POST /tenant/:tenantId/transcription
   * Transcribe uploaded audio file
   * Body: FormData with 'audio' file
   * Returns: { text: string, segments?: [...] }
   */
  app.post(
    baseRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["transcription"],
      summary: "Transcribe audio file using Mistral voxtral-mini",
      responses: {
        200: {
          description: "Transcription result",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  text: v.string(),
                  segments: v.optional(
                    v.array(
                      v.object({
                        start: v.number(),
                        end: v.number(),
                        text: v.string(),
                      })
                    )
                  ),
                })
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      try {
        const formData = await c.req.formData();
        const audioFile = formData.get("audio") as File | null;

        if (!audioFile) {
          throw new HTTPException(400, {
            message: "No audio file provided",
          });
        }

        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await transcribeAudio(buffer, audioFile.name);

        return c.json({
          success: true,
          text: result.text,
          segments: result.segments,
        });
      } catch (error) {
        console.error("Transcription error:", error);
        throw new HTTPException(500, {
          message: `Failed to transcribe audio: ${(error as Error).message}`,
        });
      }
    }
  );
}

