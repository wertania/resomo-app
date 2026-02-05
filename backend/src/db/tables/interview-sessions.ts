/**
 * Schema definition for interview sessions table
 */

import { sql } from "drizzle-orm";
import {
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { pgBaseTable } from "@framework/lib/db/schema";
import { tenants } from "@framework/lib/db/schema/users";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-valibot";

// Type definitions for JSONB columns
export type InterviewSessionMeta = {
  duration?: number;
  transcriptionStatus?: "pending" | "processing" | "completed" | "error";
  elevenlabsTranscriptionId?: string;
  transcriptionErrorMessage?: string;
  speakerTypes?: Record<string, "interviewee" | "host">; // Speaker ID -> type mapping
  mainCharacterId?: string; // Speaker ID of the main character (the person the app is centered around)
};

export type InterviewSessionTranscript = {
  language: string;
  segments: Array<{
    text: string;
    startTime: number;
    endTime?: number;
    speaker: {
      name: string;
      id: string;
    };
    words?: Array<{
      text: string;
      startTime: number;
      endTime?: number;
    }>;
  }>;
};

// Table definition
export const interviewSessions = pgBaseTable(
  "interview_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, {
        onDelete: "cascade",
      })
      .notNull(),
    fileId: uuid("file_id").notNull(), // Reference to files table
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    meta: jsonb("meta")
      .$type<InterviewSessionMeta>()
      .default({}),
    transcript: jsonb("transcript")
      .$type<InterviewSessionTranscript>(),
    createdAt: timestamp("created_at", { mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("interview_sessions_tenant_id_idx").on(table.tenantId),
    index("interview_sessions_file_id_idx").on(table.fileId),
    index("interview_sessions_created_at_idx").on(table.createdAt),
  ]
);

export type InterviewSessionsSelect = typeof interviewSessions.$inferSelect;
export type InterviewSessionsInsert = typeof interviewSessions.$inferInsert;

export const interviewSessionsSelectSchema = createSelectSchema(interviewSessions);
export const interviewSessionsInsertSchema = createInsertSchema(interviewSessions);
export const interviewSessionsUpdateSchema = createUpdateSchema(interviewSessions);
