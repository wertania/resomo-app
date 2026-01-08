/**
 * Routes for AI chat using Mistral Large
 * These routes handle streaming chat conversations
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
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { mistral } from "@ai-sdk/mistral";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/**
 * Validation schema for chat request
 */
const chatRequestSchema = v.object({
  messages: v.array(
    v.object({
      id: v.optional(v.string()),
      role: v.picklist(["user", "assistant", "system"]),
      parts: v.array(
        v.object({
          type: v.string(),
          text: v.optional(v.string()),
        })
      ),
    })
  ),
});

/**
 * Define chat routes
 */
export default function defineChatRoutes(
  app: FastAppHono,
  API_BASE_PATH: string = ""
) {
  const baseRoute = `${API_BASE_PATH}/tenant/:tenantId/chat`;

  /**
   * POST /tenant/:tenantId/chat
   * Stream chat messages using Mistral Large
   * Body: { messages: UIMessage[] }
   * Returns: Streaming response
   */
  app.post(
    baseRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Stream chat messages with Mistral Large",
      responses: {
        200: {
          description: "Streaming chat response",
          content: {
            "text/event-stream": {
              schema: resolver(v.any()),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    async (c) => {
      if (!MISTRAL_API_KEY) {
        throw new HTTPException(500, {
          message: "Mistral API key is not configured",
        });
      }

      try {
        const { messages }: { messages: UIMessage[] } = await c.req.json();

        const result = streamText({
          model: mistral("mistral-large-latest"),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse();
      } catch (error) {
        throw new HTTPException(500, {
          message: `Failed to stream chat: ${(error as Error).message}`,
        });
      }
    }
  );
}
