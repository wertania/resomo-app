/**
 * Routes for interview sessions CRUD operations
 * Note: transcript field is read-only via API
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
import {
  createInterviewSession,
  getInterviewSessions,
  getInterviewSessionById,
  updateInterviewSession,
  deleteInterviewSession,
} from "../../../../lib/interview-sessions";
import {
  interviewSessionsSelectSchema,
  interviewSessionsUpdateSchema,
} from "../../../../db/tables/interview-sessions";

/**
 * Define interview sessions routes
 */
export default function defineInterviewSessionsRoutes(
  app: FastAppHono,
  API_BASE_PATH: string = ""
) {
  const baseRoute = `${API_BASE_PATH}/tenant/:tenantId/interview-sessions`;

  /**
   * GET /tenant/:tenantId/interview-sessions
   * Get all interview sessions for a tenant
   */
  app.get(
    baseRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Get all interview sessions",
      responses: {
        200: {
          description: "List of interview sessions",
          content: {
            "application/json": {
              schema: resolver(
                v.array(interviewSessionsSelectSchema)
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
        const sessions = await getInterviewSessions(tenantId);
        return c.json(sessions);
      } catch (error) {
        throw new HTTPException(500, {
          message: `Failed to get interview sessions: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * GET /tenant/:tenantId/interview-sessions/:id
   * Get a single interview session by ID
   */
  app.get(
    `${baseRoute}/:id`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Get interview session by ID",
      responses: {
        200: {
          description: "Interview session",
          content: {
            "application/json": {
              schema: resolver(interviewSessionsSelectSchema),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string(), id: v.string() })),
    async (c) => {
      try {
        const { tenantId, id } = c.req.valid("param");
        const session = await getInterviewSessionById(id, tenantId);

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
          message: `Failed to get interview session: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * POST /tenant/:tenantId/interview-sessions
   * Create a new interview session
   * Note: transcript is required but typically comes from transcription endpoint
   */
  app.post(
    baseRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Create interview session",
      responses: {
        200: {
          description: "Created interview session",
          content: {
            "application/json": {
              schema: resolver(interviewSessionsSelectSchema),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    validator(
      "json",
      v.object({
        fileId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        meta: v.optional(
          v.object({
            duration: v.optional(v.number()),
            transcriptionStatus: v.optional(
              v.union([
                v.literal("pending"),
                v.literal("processing"),
                v.literal("completed"),
                v.literal("error"),
              ])
            ),
            elevenlabsTranscriptionId: v.optional(v.string()),
            transcriptionErrorMessage: v.optional(v.string()),
          })
        ),
        transcript: v.optional(
          v.object({
            language: v.string(),
            segments: v.array(
              v.object({
                text: v.string(),
                startTime: v.number(),
                endTime: v.optional(v.number()),
                speaker: v.object({
                  name: v.string(),
                  id: v.string(),
                }),
                words: v.optional(
                  v.array(
                    v.object({
                      text: v.string(),
                      startTime: v.number(),
                      endTime: v.optional(v.number()),
                    })
                  )
                ),
              })
            ),
          })
        ),
      })
    ),
    async (c) => {
      try {
        const { tenantId } = c.req.valid("param");
        const data = c.req.valid("json");

        const session = await createInterviewSession(tenantId, data);
        return c.json(session);
      } catch (error) {
        throw new HTTPException(500, {
          message: `Failed to create interview session: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * PATCH /tenant/:tenantId/interview-sessions/:id
   * Update an interview session (name, description, meta only - transcript is read-only)
   */
  app.patch(
    `${baseRoute}/:id`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Update interview session",
      responses: {
        200: {
          description: "Updated interview session",
          content: {
            "application/json": {
              schema: resolver(interviewSessionsSelectSchema),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string(), id: v.string() })),
    validator(
      "json",
      v.object({
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        meta: v.optional(
          v.object({
            duration: v.optional(v.number()),
          })
        ),
      })
    ),
    async (c) => {
      try {
        const { tenantId, id } = c.req.valid("param");
        const data = c.req.valid("json");

        const session = await updateInterviewSession(id, tenantId, data);
        return c.json(session);
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new HTTPException(404, {
            message: error.message,
          });
        }
        throw new HTTPException(500, {
          message: `Failed to update interview session: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * DELETE /tenant/:tenantId/interview-sessions/:id
   * Delete an interview session
   */
  app.delete(
    `${baseRoute}/:id`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Delete interview session",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                })
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string(), id: v.string() })),
    async (c) => {
      try {
        const { tenantId, id } = c.req.valid("param");
        await deleteInterviewSession(id, tenantId);
        return c.json({ success: true });
      } catch (error) {
        throw new HTTPException(500, {
          message: `Failed to delete interview session: ${(error as Error).message}`,
        });
      }
    }
  );
}
