/**
 * Business logic for chat management with AI SDK persistence
 * All database operations and business logic are separated from API layer
 */

import { getDb } from "@framework/lib/db/db-connection";
import { chats, chatMessages } from "../../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import type { UIMessage } from "ai";

// ============================================================================
// TYPES
// ============================================================================

export type ChatWithMessages = {
  id: string;
  tenantId: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageData[];
};

export type ChatMessageData = {
  id: string;
  chatId: string;
  role: string;
  content: string | null;
  parts: unknown;
  createdAt: string;
};

// ============================================================================
// CHAT OPERATIONS
// ============================================================================

/**
 * Get all chats for a user in a tenant
 */
export async function getChats(
  tenantId: string,
  userId: string
): Promise<Omit<ChatWithMessages, "messages">[]> {
  const result = await getDb()
    .select({
      id: chats.id,
      tenantId: chats.tenantId,
      userId: chats.userId,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(and(eq(chats.tenantId, tenantId), eq(chats.userId, userId)))
    .orderBy(desc(chats.updatedAt));

  return result;
}

/**
 * Get a single chat by id with all messages
 */
export async function getChatById(
  chatId: string,
  tenantId: string,
  userId: string
): Promise<ChatWithMessages | null> {
  const chat = await getDb()
    .select({
      id: chats.id,
      tenantId: chats.tenantId,
      userId: chats.userId,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.tenantId, tenantId),
        eq(chats.userId, userId)
      )
    )
    .limit(1);

  if (chat.length === 0) {
    return null;
  }

  const messages = await getDb()
    .select({
      id: chatMessages.id,
      chatId: chatMessages.chatId,
      role: chatMessages.role,
      content: chatMessages.content,
      parts: chatMessages.parts,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt));

  return {
    ...chat[0]!,
    messages,
  };
}

/**
 * Create a new chat
 */
export async function createChat(
  tenantId: string,
  userId: string,
  title?: string
): Promise<{ id: string; tenantId: string; userId: string; title: string | null; createdAt: string; updatedAt: string }> {
  const result = await getDb()
    .insert(chats)
    .values({
      tenantId,
      userId,
      title: title || null,
    })
    .returning();

  return result[0]!;
}

/**
 * Update chat title
 */
export async function updateChatTitle(
  chatId: string,
  tenantId: string,
  userId: string,
  title: string
): Promise<boolean> {
  const result = await getDb()
    .update(chats)
    .set({
      title,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.tenantId, tenantId),
        eq(chats.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Delete a chat (cascades to messages)
 */
export async function deleteChat(
  chatId: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const result = await getDb()
    .delete(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.tenantId, tenantId),
        eq(chats.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Update chat's updatedAt timestamp
 */
export async function touchChat(chatId: string): Promise<void> {
  await getDb()
    .update(chats)
    .set({
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chats.id, chatId));
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Save a single message to a chat
 */
export async function saveMessage(
  chatId: string,
  message: {
    role: string;
    content?: string;
    parts?: unknown;
  }
): Promise<ChatMessageData> {
  const result = await getDb()
    .insert(chatMessages)
    .values({
      chatId,
      role: message.role,
      content: message.content || null,
      parts: message.parts || null,
    })
    .returning();

  // Update chat's updatedAt
  await touchChat(chatId);

  return result[0]!;
}

/**
 * Save multiple messages to a chat (batch insert)
 */
export async function saveMessages(
  chatId: string,
  messages: Array<{
    role: string;
    content?: string;
    parts?: unknown;
  }>
): Promise<ChatMessageData[]> {
  if (messages.length === 0) return [];

  const result = await getDb()
    .insert(chatMessages)
    .values(
      messages.map((m) => ({
        chatId,
        role: m.role,
        content: m.content || null,
        parts: m.parts || null,
      }))
    )
    .returning();

  // Update chat's updatedAt
  await touchChat(chatId);

  return result;
}

/**
 * Convert UIMessage to storage format
 */
export function uiMessageToStorage(message: UIMessage): {
  role: string;
  content: string | null;
  parts: unknown;
} {
  // Extract text content from parts
  let textContent: string | null = null;
  if (message.parts) {
    const textPart = message.parts.find((p: any) => p.type === "text");
    if (textPart && "text" in textPart) {
      textContent = textPart.text;
    }
  }

  return {
    role: message.role,
    content: textContent,
    parts: message.parts || null,
  };
}

/**
 * Convert stored message back to UIMessage format
 */
export function storageToUIMessage(message: ChatMessageData): UIMessage {
  // If we have parts stored, use them
  if (message.parts) {
    return {
      id: message.id,
      role: message.role as UIMessage["role"],
      parts: message.parts as UIMessage["parts"],
      metadata: { createdAt: new Date(message.createdAt).toISOString() },
    };
  }

  // Otherwise, create a simple text message
  return {
    id: message.id,
    role: message.role as UIMessage["role"],
    parts: message.content ? [{ type: "text", text: message.content }] : [],
    metadata: { createdAt: new Date(message.createdAt).toISOString() },
  };
}

/**
 * Get messages for a chat as UIMessages
 */
export async function getChatMessagesAsUIMessages(
  chatId: string
): Promise<UIMessage[]> {
  const messages = await getDb()
    .select({
      id: chatMessages.id,
      chatId: chatMessages.chatId,
      role: chatMessages.role,
      content: chatMessages.content,
      parts: chatMessages.parts,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt));

  return messages.map(storageToUIMessage);
}

/**
 * Generate a title from the first user message
 */
export function generateTitleFromMessage(content: string): string {
  // Take first 50 characters or first sentence
  const firstSentence = content.split(/[.!?]/)[0] || content;
  const title = firstSentence.slice(0, 50).trim();
  return title.length < firstSentence.length ? `${title}...` : title;
}
