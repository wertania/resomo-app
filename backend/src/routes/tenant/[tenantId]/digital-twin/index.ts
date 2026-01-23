/**
 * Routes for Digital Twin protocol functionality
 * Handles protocol submission with AI-powered summarization and brain processing
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
import { createKnowledgeText } from "@framework/lib/knowledge/knowledge-texts";
import {
  ensureWikiEntryExists,
  generateProtocolTitle,
  formatProtocolContent,
} from "../../../../lib/knowledge/wiki-helpers";
import { generateProtocolSummary } from "../../../../lib/knowledge/protocol-summarizer";
import {
  processProtocol,
  validateMistralConfig,
} from "../../../../lib/knowledge/digital-twin-brain-agent";

const JOURNAL_FOLDER_NAME = "99_journal";

/**
 * Request schema for protocol submission
 */
const protocolRequestSchema = v.object({
  entryPointId: v.string(),
  transcript: v.pipe(v.string(), v.minLength(1)),
});

/**
 * Response schema for protocol submission
 */
const protocolResponseSchema = v.object({
  success: v.boolean(),
  entryId: v.string(),
  title: v.string(),
  summary: v.string(),
});

/**
 * Request schema for brain processing
 */
const processProtocolRequestSchema = v.object({
  entryPointId: v.string(),
  protocol: v.pipe(v.string(), v.minLength(1)),
});

/**
 * Response schema for brain processing
 */
const processProtocolResponseSchema = v.object({
  success: v.boolean(),
  processedFacts: v.number(),
  updatedCategories: v.array(v.string()),
  newCategories: v.array(v.string()),
  errors: v.array(v.string()),
});

/**
 * Define digital twin routes
 */
export default function defineDigitalTwinRoutes(
  app: FastAppHono,
  API_BASE_PATH: string = ""
) {
  const baseRoute = `${API_BASE_PATH}/tenant/:tenantId/digital-twin`;

  /**
   * POST /tenant/:tenantId/digital-twin/protocol
   * Submit a protocol entry with automatic summarization
   * Body: { entryPointId: string, transcript: string }
   * Returns: { success: boolean, entryId: string, title: string, summary: string }
   */
  app.post(
    `${baseRoute}/protocol`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["digital-twin"],
      summary: "Submit a protocol entry with AI-powered summarization",
      responses: {
        200: {
          description: "Protocol entry created successfully",
          content: {
            "application/json": {
              schema: resolver(protocolResponseSchema),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    validator("json", protocolRequestSchema),
    async (c) => {
      const { tenantId } = c.req.valid("param");
      const { entryPointId, transcript } = c.req.valid("json");
      const userId = c.get("usersId");

      if (!userId) {
        throw new HTTPException(401, {
          message: "User not authenticated",
        });
      }

      try {
        // Step 1: Ensure journal folder exists under entry point
        const journalFolderId = await ensureWikiEntryExists({
          parentId: entryPointId,
          title: JOURNAL_FOLDER_NAME,
          tenantId,
          userId,
          text: "# Journal\n\nThis folder contains protocol entries.",
          hidden: false,
        });

        // Step 2: Generate protocol title with timestamp
        const protocolTitle = generateProtocolTitle();

        // Step 3: Create initial wiki entry with just the transcript
        const initialEntry = await createKnowledgeText({
          tenantId,
          userId,
          parentId: journalFolderId,
          title: protocolTitle,
          text: transcript,
          tenantWide: false,
          hidden: false,
        });

        // Step 4: Generate AI summary in original language
        const summary = await generateProtocolSummary(transcript);

        // Step 5: Format the final content with frontmatter
        const formattedContent = formatProtocolContent({
          summary,
          original: transcript,
          createdAt: new Date(),
        });

        // Step 6: Update the entry with formatted content
        // We use direct DB update to avoid creating history for the initial save
        const { getDb } = await import("@framework/lib/db/db-connection");
        const { knowledgeText } = await import(
          "@framework/lib/db/schema/knowledge"
        );
        const { eq } = await import("drizzle-orm");

        await getDb()
          .update(knowledgeText)
          .set({ text: formattedContent })
          .where(eq(knowledgeText.id, initialEntry.id));

        return c.json({
          success: true,
          entryId: initialEntry.id,
          title: protocolTitle,
          summary,
        });
      } catch (error) {
        console.error("Protocol submission error:", error);
        throw new HTTPException(500, {
          message: `Failed to submit protocol: ${(error as Error).message}`,
        });
      }
    }
  );

  /**
   * POST /tenant/:tenantId/digital-twin/process-protocol
   * Process a protocol and merge key facts into the digital twin brain
   * Uses an AI agent with tools to analyze, categorize, and store facts
   * Body: { entryPointId: string, protocol: string }
   * Returns: { success: boolean, processedFacts: number, updatedCategories: string[], newCategories: string[], errors: string[] }
   */
  app.post(
    `${baseRoute}/process-protocol`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["digital-twin"],
      summary:
        "Process a protocol and merge key facts into the digital twin brain",
      description: `This endpoint uses an AI agent to:
1. Extract key facts from the protocol
2. Categorize facts into the existing wiki structure
3. Create new subcategories as needed (level 2 and 3 only)
4. Merge facts into existing entries or create new ones

The digital twin brain has a maximum of 3 levels:
- Level 1: Main categories (managed by user)
- Level 2 & 3: Subcategories (managed by agent, max 10 per parent)

The agent will automatically ensure a "90_other" fallback category exists.`,
      responses: {
        200: {
          description: "Protocol processed successfully",
          content: {
            "application/json": {
              schema: resolver(processProtocolResponseSchema),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    validator("json", processProtocolRequestSchema),
    async (c) => {
      const { tenantId } = c.req.valid("param");
      const { entryPointId, protocol } = c.req.valid("json");
      const userId = c.get("usersId");

      if (!userId) {
        throw new HTTPException(401, {
          message: "User not authenticated",
        });
      }

      try {
        // Validate configuration
        validateMistralConfig();
      } catch (error) {
        throw new HTTPException(500, {
          message: (error as Error).message,
        });
      }

      try {
        // Process the protocol using the brain agent
        const result = await processProtocol({
          entryPointId,
          tenantId,
          userId,
          protocol,
        });

        return c.json(result);
      } catch (error) {
        console.error("Protocol processing error:", error);
        throw new HTTPException(500, {
          message: `Failed to process protocol: ${(error as Error).message}`,
        });
      }
    }
  );

  return app;
}
