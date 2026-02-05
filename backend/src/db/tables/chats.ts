import { sql } from "drizzle-orm";
import { uuid, index, varchar, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { pgBaseTable } from "@framework/lib/db/schema";
import { relations } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-valibot";
import { tenants, users } from "@framework/lib/db/schema/users";

// ============================================================================
// CHATS TABLE
// ============================================================================

export const chats = pgBaseTable(
  "chats",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    title: varchar("title", { length: 255 }),
    createdAt: timestamp("created_at", { mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chats_tenant_id_idx").on(table.tenantId),
    index("chats_user_id_idx").on(table.userId),
    index("chats_created_at_idx").on(table.createdAt),
  ]
);

export const chatsRelations = relations(chats, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chats.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export type ChatsSelect = typeof chats.$inferSelect;
export type ChatsInsert = typeof chats.$inferInsert;

export const chatsSelectSchema = createSelectSchema(chats);
export const chatsInsertSchema = createInsertSchema(chats);
export const chatsUpdateSchema = createUpdateSchema(chats);

// ============================================================================
// CHAT MESSAGES TABLE
// ============================================================================

export const chatMessages = pgBaseTable(
  "chat_messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    chatId: uuid("chat_id")
      .references(() => chats.id, {
        onDelete: "cascade",
      })
      .notNull(),
    role: varchar("role", { length: 50 }).notNull(), // 'user' | 'assistant' | 'system'
    content: text("content"), // Plain text content (for simple messages)
    parts: jsonb("parts"), // UIMessage parts as JSON (for structured messages with tools)
    createdAt: timestamp("created_at", { mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_chat_id_idx").on(table.chatId),
    index("chat_messages_created_at_idx").on(table.createdAt),
  ]
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMessages.chatId],
    references: [chats.id],
  }),
}));

export type ChatMessagesSelect = typeof chatMessages.$inferSelect;
export type ChatMessagesInsert = typeof chatMessages.$inferInsert;

export const chatMessagesSelectSchema = createSelectSchema(chatMessages);
export const chatMessagesInsertSchema = createInsertSchema(chatMessages);
export const chatMessagesUpdateSchema = createUpdateSchema(chatMessages);
