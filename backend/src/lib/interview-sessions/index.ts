/**
 * Business logic for interview sessions
 */

import { getDb } from "@framework/lib/db/db-connection";
import {
  interviewSessions,
  type InterviewSessionsSelect,
  type InterviewSessionsInsert,
  type InterviewSessionTranscript,
  type InterviewSessionMeta,
} from "../../db/tables/interview-sessions";
import { eq, desc, and } from "drizzle-orm";

/**
 * Create a new interview session
 */
export async function createInterviewSession(
  tenantId: string,
  data: {
    fileId: string;
    name: string;
    description?: string;
    meta?: InterviewSessionMeta;
    transcript?: InterviewSessionTranscript;
  }
): Promise<InterviewSessionsSelect> {
  const db = getDb();

  const [session] = await db
    .insert(interviewSessions)
    .values({
      tenantId,
      fileId: data.fileId,
      name: data.name,
      description: data.description,
      meta: data.meta || {},
      transcript: data.transcript || null,
    })
    .returning();

  if (!session) {
    throw new Error("Failed to create interview session");
  }

  return session;
}

/**
 * Get all interview sessions for a tenant
 */
export async function getInterviewSessions(
  tenantId: string
): Promise<InterviewSessionsSelect[]> {
  const db = getDb();

  return await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.tenantId, tenantId))
    .orderBy(desc(interviewSessions.createdAt));
}

/**
 * Get a single interview session by ID
 */
export async function getInterviewSessionById(
  id: string,
  tenantId: string
): Promise<InterviewSessionsSelect | null> {
  const db = getDb();

  const [session] = await db
    .select()
    .from(interviewSessions)
    .where(
      and(
        eq(interviewSessions.id, id),
        eq(interviewSessions.tenantId, tenantId)
      )
    )
    .limit(1);

  return session || null;
}

/**
 * Update an interview session (name, description, meta only - transcript is read-only)
 */
export async function updateInterviewSession(
  id: string,
  tenantId: string,
  data: {
    name?: string;
    description?: string;
    meta?: InterviewSessionMeta;
  }
): Promise<InterviewSessionsSelect> {
  const db = getDb();

  const updateData: Partial<InterviewSessionsInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.meta !== undefined) {
    updateData.meta = data.meta;
  }

  const [session] = await db
    .update(interviewSessions)
    .set(updateData)
    .where(
      and(
        eq(interviewSessions.id, id),
        eq(interviewSessions.tenantId, tenantId)
      )
    )
    .returning();

  if (!session) {
    throw new Error("Interview session not found or update failed");
  }

  return session;
}

/**
 * Update interview session transcription status and transcript (internal use only - called by transcription processor)
 */
export async function updateInterviewSessionTranscript(
  id: string,
  tenantId: string,
  transcript: InterviewSessionTranscript,
  duration?: number,
  status: "completed" | "error" = "completed",
  errorMessage?: string
): Promise<InterviewSessionsSelect> {
  const db = getDb();

  const session = await getInterviewSessionById(id, tenantId);
  if (!session) {
    throw new Error("Interview session not found");
  }

  const meta: InterviewSessionMeta = {
    ...(session.meta || {}),
    transcriptionStatus: status,
    ...(duration !== undefined ? { duration } : {}),
    ...(errorMessage ? { transcriptionErrorMessage: errorMessage } : {}),
  };

  const updateData: Partial<InterviewSessionsInsert> = {
    updatedAt: new Date().toISOString(),
    transcript,
    meta,
  };

  const [updatedSession] = await db
    .update(interviewSessions)
    .set(updateData)
    .where(
      and(
        eq(interviewSessions.id, id),
        eq(interviewSessions.tenantId, tenantId)
      )
    )
    .returning();

  if (!updatedSession) {
    throw new Error("Interview session not found or update failed");
  }

  return updatedSession;
}

/**
 * Update interview session transcription status (for polling)
 */
export async function updateInterviewSessionTranscriptionStatus(
  id: string,
  tenantId: string,
  status: "pending" | "processing" | "completed" | "error",
  elevenlabsTranscriptionId?: string,
  errorMessage?: string
): Promise<InterviewSessionsSelect> {
  const db = getDb();

  const session = await getInterviewSessionById(id, tenantId);
  if (!session) {
    throw new Error("Interview session not found");
  }

  const meta: InterviewSessionMeta = {
    ...(session.meta || {}),
    transcriptionStatus: status,
    ...(elevenlabsTranscriptionId
      ? { elevenlabsTranscriptionId }
      : {}),
    ...(errorMessage ? { transcriptionErrorMessage: errorMessage } : {}),
  };

  const updateData: Partial<InterviewSessionsInsert> = {
    updatedAt: new Date().toISOString(),
    meta,
  };

  const [updatedSession] = await db
    .update(interviewSessions)
    .set(updateData)
    .where(
      and(
        eq(interviewSessions.id, id),
        eq(interviewSessions.tenantId, tenantId)
      )
    )
    .returning();

  if (!updatedSession) {
    throw new Error("Interview session not found or update failed");
  }

  return updatedSession;
}

/**
 * Delete an interview session
 */
export async function deleteInterviewSession(
  id: string,
  tenantId: string
): Promise<void> {
  const db = getDb();

  await db
    .delete(interviewSessions)
    .where(
      and(
        eq(interviewSessions.id, id),
        eq(interviewSessions.tenantId, tenantId)
      )
    );
}

/**
 * Generate markdown from interview transcript with speaker separation
 * @param session - Interview session with transcript
 * @returns Formatted markdown string
 */
export function generateInterviewMarkdown(
  session: InterviewSessionsSelect
): string {
  if (!session.transcript) {
    throw new Error("Interview session has no transcript");
  }

  const { transcript, meta } = session;
  const speakerTypes = meta?.speakerTypes || {};

  // Header
  let markdown = `# ${session.name}\n\n`;

  if (session.description) {
    markdown += `${session.description}\n\n`;
  }

  markdown += `---\n\n`;
  markdown += `**Language:** ${transcript.language}\n`;
  markdown += `**Duration:** ${meta?.duration ? `${Math.round(meta.duration)}s` : "Unknown"}\n`;
  markdown += `**Date:** ${new Date(session.createdAt).toLocaleString("de-DE")}\n\n`;

  // Speaker types if available
  if (Object.keys(speakerTypes).length > 0) {
    markdown += `**Speakers:**\n`;
    for (const [speakerId, speakerType] of Object.entries(speakerTypes)) {
      const speakerName = transcript.segments.find(s => s.speaker.id === speakerId)?.speaker.name || `Speaker ${speakerId}`;
      markdown += `- ${speakerName}: ${speakerType}\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;

  // Transcript segments
  for (const segment of transcript.segments) {
    const speakerId = segment.speaker.id;
    const speakerType = speakerTypes[speakerId];
    const speakerLabel = speakerType
      ? `${segment.speaker.name} (${speakerType})`
      : segment.speaker.name;

    const timestamp = formatTimestamp(segment.startTime);

    markdown += `## ${speakerLabel}\n`;
    markdown += `*[${timestamp}]*\n\n`;
    markdown += `${segment.text}\n\n`;
  }

  return markdown;
}

/**
 * Format timestamp from seconds to MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
