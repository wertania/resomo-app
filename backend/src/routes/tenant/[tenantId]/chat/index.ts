/**
 * Routes for AI chat with persistence
 * These routes handle streaming chat conversations and chat history
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
import { convertToModelMessages, ToolLoopAgent, type UIMessage } from "ai";
import {
  getChats,
  getChatById,
  createChat,
  updateChatTitle,
  deleteChat,
  saveMessage,
  uiMessageToStorage,
  storageToUIMessage,
  generateTitleFromMessage,
} from "../../../../lib/chat";
import {
  createCharacterChatTools,
  buildCharacterChatInstructions,
  STANDARD_AI_MODEL,
} from "../../../../lib/ai/tools";
import { getDigitalTwinEntryPointId } from "../../../../lib/user-settings";

/**
 * Define chat routes
 */
export default function defineChatRoutes(
  app: FastAppHono,
  API_BASE_PATH: string = ""
) {
  const baseRoute = `${API_BASE_PATH}/tenant/:tenantId/chat`;
  const chatsRoute = `${API_BASE_PATH}/tenant/:tenantId/chats`;

  // ============================================================================
  // CHAT LIST OPERATIONS
  // ============================================================================

  /**
   * GET /tenant/:tenantId/chats
   * Get all chats for the current user
   */
  app.get(
    chatsRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Get all chats for the current user",
      responses: {
        200: {
          description: "List of chats",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  data: v.array(
                    v.object({
                      id: v.string(),
                      title: v.nullable(v.string()),
                      createdAt: v.string(),
                      updatedAt: v.string(),
                    })
                  ),
                })
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    async (c) => {
      const { tenantId } = c.req.valid("param");
      const userId = c.get("usersId");

      const chatList = await getChats(tenantId, userId);

      return c.json({
        success: true,
        data: chatList.map((chat) => ({
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
        })),
      });
    }
  );

  /**
   * POST /tenant/:tenantId/chats
   * Create a new empty chat
   */
  app.post(
    chatsRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Create a new chat",
      responses: {
        200: {
          description: "Created chat",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  data: v.object({
                    id: v.string(),
                    title: v.nullable(v.string()),
                    createdAt: v.string(),
                    updatedAt: v.string(),
                  }),
                })
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ tenantId: v.string() })),
    async (c) => {
      const { tenantId } = c.req.valid("param");
      const userId = c.get("usersId");

      const newChat = await createChat(tenantId, userId);

      return c.json({
        success: true,
        data: {
          id: newChat.id,
          title: newChat.title,
          createdAt: newChat.createdAt,
          updatedAt: newChat.updatedAt,
        },
      });
    }
  );

  /**
   * GET /tenant/:tenantId/chats/:chatId
   * Get a single chat with all messages
   */
  app.get(
    `${chatsRoute}/:chatId`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Get a chat with all messages",
      responses: {
        200: {
          description: "Chat with messages",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  success: v.boolean(),
                  data: v.object({
                    id: v.string(),
                    title: v.nullable(v.string()),
                    createdAt: v.string(),
                    updatedAt: v.string(),
                    messages: v.array(v.any()),
                  }),
                })
              ),
            },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ tenantId: v.string(), chatId: v.string() })
    ),
    async (c) => {
      const { tenantId, chatId } = c.req.valid("param");
      const userId = c.get("usersId");

      const chat = await getChatById(chatId, tenantId, userId);

      if (!chat) {
        throw new HTTPException(404, { message: "Chat not found" });
      }

      // Convert messages to UIMessage format
      const uiMessages = chat.messages.map(storageToUIMessage);

      return c.json({
        success: true,
        data: {
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messages: uiMessages,
        },
      });
    }
  );

  /**
   * DELETE /tenant/:tenantId/chats/:chatId
   * Delete a chat
   */
  app.delete(
    `${chatsRoute}/:chatId`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Delete a chat",
      responses: {
        200: {
          description: "Chat deleted",
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
    validator(
      "param",
      v.object({ tenantId: v.string(), chatId: v.string() })
    ),
    async (c) => {
      const { tenantId, chatId } = c.req.valid("param");
      const userId = c.get("usersId");

      const deleted = await deleteChat(chatId, tenantId, userId);

      if (!deleted) {
        throw new HTTPException(404, { message: "Chat not found" });
      }

      return c.json({ success: true });
    }
  );

  /**
   * PATCH /tenant/:tenantId/chats/:chatId
   * Update chat title
   */
  app.patch(
    `${chatsRoute}/:chatId`,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Update chat title",
      responses: {
        200: {
          description: "Chat updated",
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
    validator(
      "param",
      v.object({ tenantId: v.string(), chatId: v.string() })
    ),
    validator("json", v.object({ title: v.string() })),
    async (c) => {
      const { tenantId, chatId } = c.req.valid("param");
      const { title } = c.req.valid("json");
      const userId = c.get("usersId");

      const updated = await updateChatTitle(chatId, tenantId, userId, title);

      if (!updated) {
        throw new HTTPException(404, { message: "Chat not found" });
      }

      return c.json({ success: true });
    }
  );

  // ============================================================================
  // CHAT STREAMING (with persistence)
  // ============================================================================

  /**
   * POST /tenant/:tenantId/chat
   * Stream chat messages with persistence
   * Body: { messages: UIMessage[], chatId: string }
   * Returns: Streaming response
   */
  app.post(
    baseRoute,
    authAndSetUsersInfo,
    checkUserPermission,
    describeRoute({
      tags: ["chat"],
      summary: "Stream chat messages with AI agent (with persistence)",
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
      try {
        const { messages, chatId }: { messages: UIMessage[]; chatId: string } =
          await c.req.json();
        const { tenantId } = c.req.valid("param");
        const userId = c.get("usersId");

        // chatId is required
        if (!chatId) {
          throw new HTTPException(400, { message: "chatId is required" });
        }

        // Verify chat belongs to user
        const existingChat = await getChatById(chatId, tenantId, userId);
        if (!existingChat) {
          throw new HTTPException(404, { message: "Chat not found" });
        }

        // Check if this is the first message (for title generation)
        const isFirstMessage = existingChat.messages.length === 0;

        // Save the user's message (last message in the array)
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "user") {
          const storageMsg = uiMessageToStorage(lastMessage);
          await saveMessage(chatId, {
            role: storageMsg.role,
            content: storageMsg.content || undefined,
            parts: storageMsg.parts,
          });

          // Generate title from first user message
          if (isFirstMessage) {
            const textPart = lastMessage.parts?.find((p: any) => p.type === "text");
            if (textPart && "text" in textPart) {
              const title = generateTitleFromMessage(textPart.text);
              await updateChatTitle(chatId, tenantId, userId, title);
            }
          }
        }

        // Get user's digital twin entry point for wiki navigation
        const entryPointId = await getDigitalTwinEntryPointId(userId, tenantId);

        // Create character chat tools with context
        const tools = await createCharacterChatTools({
          tenantId,
          userId,
          entryPointId: entryPointId || undefined,
        });

        // Create the character chat agent
        const agent = new ToolLoopAgent({
          model: STANDARD_AI_MODEL,
          instructions: buildCharacterChatInstructions(),
          tools: {
            vectorSearch: tools.vectorSearch,
            wikiSearch: tools.wikiSearch,
            wikiRead: tools.wikiRead,
            wikiNavigate: tools.wikiNavigate,
          },
        });

        const result = await agent.stream({
          messages: await convertToModelMessages(messages),
        });

        // Save assistant response after stream completes (non-blocking)
        (async () => {
          try {
            await result.consumeStream();
            const text = await result.text;
            if (text) {
              await saveMessage(chatId!, {
                role: "assistant",
                content: text,
                parts: [{ type: "text", text }],
              });
            }
          } catch (error) {
            console.error("[Chat] Error saving assistant message:", error);
          }
        })();

        return result.toUIMessageStreamResponse();
      } catch (error) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(500, {
          message: `Failed to stream chat: ${(error as Error).message}`,
        });
      }
    }
  );
}
