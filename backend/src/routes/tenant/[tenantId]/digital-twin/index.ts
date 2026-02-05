/**
 * Routes for Digital Twin protocol functionality
 * Handles protocol submission with AI-powered summarization
 * 
 * NOTE: Brain processing has been moved to the personal-wiki-agent
 * Use POST /tenant/:tenantId/interview-sessions/process-voice-memo for processing
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

  return app;
}
