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
  generateInterviewMarkdown,
} from "../../../../lib/interview-sessions";
import { processInterview } from "../../../../lib/knowledge/personal-wiki-agent";
import { getDigitalTwinEntryPointId } from "../../../../lib/user-settings";
import { analyzeSpeakerTypes } from "../../../../lib/interview-sessions/speaker-type-analyzer";
import {
  createInterviewEmbedding,
  removeInterviewEmbedding,
} from "../../../../lib/interview-embedding";
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
            mainCharacterId: v.optional(v.string()), // Speaker ID of the main character
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

  /**
   * GET /tenant/:tenantId/interview-sessions/:id/markdown
   * Download interview transcript as markdown/text file
   */
  app.get(
    `${baseRoute}/:id/markdown`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Download interview markdown",
      responses: {
        200: {
          description: "Interview transcript as markdown text",
          content: {
            "text/plain": {},
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

        if (!session.transcript) {
          throw new HTTPException(400, {
            message: "Interview session has no transcript",
          });
        }

        const markdown = generateInterviewMarkdown(session);

        // Generate filename from session name
        const filename = `${session.name.replace(/[^a-z0-9_-]/gi, "_")}.txt`;

        // Return as text file download
        return c.text(markdown, 200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        });
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: `Failed to generate markdown: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * PUT /tenant/:tenantId/interview-sessions/:id/main-character
   * Set the main character (the person the app is centered around) for this interview
   */
  app.put(
    `${baseRoute}/:id/main-character`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Set main character for interview",
      description: "Set which speaker is the main character (the person the app is centered around)",
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
        speakerId: v.string(), // The speaker ID to set as main character
      })
    ),
    async (c) => {
      try {
        const { tenantId, id } = c.req.valid("param");
        const { speakerId } = c.req.valid("json");
        
        const session = await getInterviewSessionById(id, tenantId);

        if (!session) {
          throw new HTTPException(404, {
            message: "Interview session not found",
          });
        }

        // Validate that the speaker exists in the transcript
        if (session.transcript) {
          const speakerIds = session.transcript.segments.map(s => s.speaker.id);
          if (!speakerIds.includes(speakerId)) {
            throw new HTTPException(400, {
              message: `Speaker ID "${speakerId}" not found in transcript. Available speakers: ${[...new Set(speakerIds)].join(", ")}`,
            });
          }
        }

        // Update session with main character
        const updatedSession = await updateInterviewSession(id, tenantId, {
          meta: {
            mainCharacterId: speakerId,
          },
        });

        return c.json(updatedSession);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: `Failed to set main character: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * DELETE /tenant/:tenantId/interview-sessions/:id/main-character
   * Remove the main character setting from this interview
   */
  app.delete(
    `${baseRoute}/:id/main-character`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Remove main character setting",
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
    async (c) => {
      try {
        const { tenantId, id } = c.req.valid("param");
        
        const session = await getInterviewSessionById(id, tenantId);

        if (!session) {
          throw new HTTPException(404, {
            message: "Interview session not found",
          });
        }

        // Remove mainCharacterId from meta
        const updatedSession = await updateInterviewSession(id, tenantId, {
          meta: {
            mainCharacterId: undefined,
          },
        });

        return c.json(updatedSession);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: `Failed to remove main character: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * POST /tenant/:tenantId/interview-sessions/:id/analyze-speakers
   * Analyze speaker types using AI and update session metadata
   */
  app.post(
    `${baseRoute}/:id/analyze-speakers`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Analyze speaker types",
      responses: {
        200: {
          description: "Speaker type analysis result",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  speakerTypes: v.record(
                    v.string(),
                    v.union([v.literal("interviewee"), v.literal("host")])
                  ),
                  reasoning: v.optional(v.string()),
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
        const session = await getInterviewSessionById(id, tenantId);

        if (!session) {
          throw new HTTPException(404, {
            message: "Interview session not found",
          });
        }

        if (!session.transcript) {
          throw new HTTPException(400, {
            message: "Interview session has no transcript",
          });
        }

        // Run AI analysis
        const analysis = await analyzeSpeakerTypes(session);

        // Update session metadata with speaker types
        await updateInterviewSession(id, tenantId, {
          meta: {
            ...(session.meta || {}),
            speakerTypes: analysis.speakerTypes,
          },
        });

        return c.json(analysis);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: `Failed to analyze speakers: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * POST /tenant/:tenantId/interview-sessions/:id/process-wiki
   * Process interview and extract personal information into the wiki
   */
  app.post(
    `${baseRoute}/:id/process-wiki`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Process interview for personal wiki",
      description: "Extract personal information from interview and save to wiki. Requires mainCharacterId and configured digital twin entry point.",
      responses: {
        200: {
          description: "Processing result",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  processedFacts: v.number(),
                  updatedCategories: v.array(v.string()),
                  newCategories: v.array(v.string()),
                  errors: v.array(v.string()),
                  interviewEntryId: v.optional(v.string()),
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
        const userId = c.get("usersId");
        
        // Get interview session
        const session = await getInterviewSessionById(id, tenantId);
        if (!session) {
          throw new HTTPException(404, {
            message: "Interview session not found",
          });
        }

        // Check if transcript exists
        if (!session.transcript) {
          throw new HTTPException(400, {
            message: "Interview session has no transcript. Please wait for transcription to complete.",
          });
        }

        // Check if mainCharacterId is set
        const mainCharacterId = session.meta?.mainCharacterId;
        if (!mainCharacterId) {
          throw new HTTPException(400, {
            message: "Main character not set. Please set the main character (Hauptperson) first.",
          });
        }

        // Get main character name from transcript
        const mainCharacterSegment = session.transcript.segments.find(
          s => s.speaker.id === mainCharacterId
        );
        const mainCharacterName = mainCharacterSegment?.speaker.name || `Speaker ${mainCharacterId}`;

        // Get user settings to find digital twin entry point
        const entryPointId = await getDigitalTwinEntryPointId(userId, tenantId);
        
        if (!entryPointId) {
          throw new HTTPException(400, {
            message: "No personal wiki entry point configured. Please set a 'Digital Twin' entry point in the Wiki first.",
          });
        }

        // Generate interview markdown
        const interviewMarkdown = generateInterviewMarkdown(session);

        // Process interview with personal wiki agent
        const result = await processInterview({
          entryPointId,
          tenantId,
          userId,
          interviewMarkdown,
          interviewName: session.name,
          mainCharacterName,
        });

        // Update session metadata to mark as processed
        await updateInterviewSession(id, tenantId, {
          meta: {
            wikiProcessed: true,
            wikiProcessedAt: new Date().toISOString(),
            wikiProcessedResult: {
              processedFacts: result.processedFacts,
              updatedCategories: result.updatedCategories,
              newCategories: result.newCategories,
            },
          },
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        console.error("Error processing interview for wiki:", error);
        throw new HTTPException(500, {
          message: `Failed to process interview: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * POST /tenant/:tenantId/interview-sessions/:id/create-embedding
   * Create a knowledge entry with vector embeddings from the interview transcript.
   * This enables semantic/vector search over interview content in the chat.
   */
  app.post(
    `${baseRoute}/:id/create-embedding`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Create knowledge embedding for interview",
      description: "Creates a knowledge entry with vector embeddings from the interview transcript for semantic search in the character chat.",
      responses: {
        200: {
          description: "Embedding creation result",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  knowledgeEntryId: v.optional(v.string()),
                  knowledgeGroupId: v.optional(v.string()),
                  error: v.optional(v.string()),
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
        const userId = c.get("usersId");

        const result = await createInterviewEmbedding(id, tenantId, userId);

        if (!result.success) {
          throw new HTTPException(400, {
            message: result.error || "Failed to create embedding",
          });
        }

        return c.json(result);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        console.error("Error creating interview embedding:", error);
        throw new HTTPException(500, {
          message: `Failed to create embedding: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * DELETE /tenant/:tenantId/interview-sessions/:id/embedding
   * Remove the knowledge embedding for an interview
   */
  app.delete(
    `${baseRoute}/:id/embedding`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Remove knowledge embedding for interview",
      description: "Removes the knowledge entry and vector embeddings for this interview.",
      responses: {
        200: {
          description: "Result",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  error: v.optional(v.string()),
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
        const userId = c.get("usersId");

        const result = await removeInterviewEmbedding(id, tenantId, userId);

        return c.json(result);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(500, {
          message: `Failed to remove embedding: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * POST /tenant/:tenantId/interview-sessions/process-voice-memo
   * Process a voice memo / spoken memory directly from the dashboard
   * This creates a simplified interview and processes it immediately
   */
  app.post(
    `${baseRoute}/process-voice-memo`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["interview-sessions"],
      summary: "Process voice memo for personal wiki",
      description: "Process a spoken memory/story directly and save to wiki. Used from the dashboard.",
      responses: {
        200: {
          description: "Processing result",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  processedFacts: v.number(),
                  updatedCategories: v.array(v.string()),
                  newCategories: v.array(v.string()),
                  errors: v.array(v.string()),
                  interviewEntryId: v.optional(v.string()),
                })
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    validator(
      "json",
      v.object({
        entryPointId: v.string(),
        transcript: v.pipe(v.string(), v.minLength(1)),
        saveToWiki: v.optional(v.boolean()),
      })
    ),
    async (c) => {
      try {
        const { tenantId } = c.req.valid("param");
        const { entryPointId, transcript, saveToWiki = true } = c.req.valid("json");
        const userId = c.get("usersId");

        if (!saveToWiki) {
          // If not saving to wiki, just return success
          return c.json({
            success: true,
            processedFacts: 0,
            updatedCategories: [],
            newCategories: [],
            errors: [],
          });
        }

        // Generate a simple markdown format for the voice memo
        const now = new Date();
        const dateStr = now.toLocaleDateString("de-DE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const timeStr = now.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const interviewMarkdown = `# Erinnerung vom ${dateStr}

**Aufgenommen um:** ${timeStr}

---

${transcript}
`;

        // Process with personal wiki agent
        // For voice memos, we use a generic name since there's no "main character" per se
        const result = await processInterview({
          entryPointId,
          tenantId,
          userId,
          interviewMarkdown,
          interviewName: `Erinnerung_${now.toISOString().split("T")[0]}`,
          mainCharacterName: "Erzähler", // Generic name for voice memos
        });

        return c.json(result);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        console.error("Error processing voice memo:", error);
        throw new HTTPException(500, {
          message: `Failed to process voice memo: ${(error as Error).message}`,
        });
      }
    }
  );
}
