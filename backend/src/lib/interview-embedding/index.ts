/**
 * Interview Embedding System
 * Creates knowledge entries with vector embeddings from interview transcripts
 * for semantic search in the character chat.
 */

import { getDb } from "@framework/lib/db/db-connection";
import { knowledgeGroup } from "@framework/lib/db/schema/knowledge";
import {
  createKnowledgeGroup,
  getKnowledgeGroups,
} from "@framework/lib/knowledge/knowledge-groups";
import { extractKnowledgeFromText } from "@framework/lib/knowledge/add-knowledge";
import { deleteKnowledgeEntry } from "@framework/lib/knowledge/update-knowledge";
import { eq, and } from "drizzle-orm";
import {
  getInterviewSessionById,
  updateInterviewSession,
  generateInterviewMarkdown,
} from "../interview-sessions";
import type { InterviewSessionsSelect } from "../../db/tables/interview-sessions";

// Name of the knowledge group for main character interviews
const MAIN_CHARACTER_GROUP_NAME = "main-character";

/**
 * Result of embedding an interview
 */
export interface EmbedInterviewResult {
  success: boolean;
  knowledgeEntryId?: string;
  knowledgeGroupId?: string;
  error?: string;
}

/**
 * Ensure the "main-character" knowledge group exists for a tenant.
 * Creates it if it doesn't exist.
 * 
 * @param tenantId - Tenant ID
 * @param userId - User ID (owner of the group)
 * @returns The knowledge group ID
 */
export async function ensureMainCharacterGroup(
  tenantId: string,
  userId: string
): Promise<string> {
  const db = getDb();

  // Check if group already exists
  const existingGroups = await db
    .select()
    .from(knowledgeGroup)
    .where(
      and(
        eq(knowledgeGroup.tenantId, tenantId),
        eq(knowledgeGroup.name, MAIN_CHARACTER_GROUP_NAME)
      )
    )
    .limit(1);

  if (existingGroups.length > 0) {
    return existingGroups[0]!.id;
  }

  // Create the group
  const newGroup = await createKnowledgeGroup({
    tenantId,
    userId,
    name: MAIN_CHARACTER_GROUP_NAME,
    description:
      "Knowledge base for the main character - contains embedded interview transcripts for semantic search",
    tenantWideAccess: true, // All users in tenant can access
  });

  return newGroup.id;
}

/**
 * Create a knowledge entry with embeddings from an interview session.
 * This allows semantic/vector search over interview content.
 * 
 * @param interviewId - Interview session ID
 * @param tenantId - Tenant ID
 * @param userId - User ID performing the action
 * @returns Result with knowledge entry ID or error
 */
export async function createInterviewEmbedding(
  interviewId: string,
  tenantId: string,
  userId: string
): Promise<EmbedInterviewResult> {
  try {
    // Get the interview session
    const session = await getInterviewSessionById(interviewId, tenantId);
    if (!session) {
      return { success: false, error: "Interview session not found" };
    }

    // Check if transcript exists
    if (!session.transcript) {
      return { success: false, error: "Interview has no transcript yet" };
    }

    // If already embedded, delete old entry first
    if (session.meta?.knowledgeEntryId) {
      try {
        await deleteKnowledgeEntry(
          session.meta.knowledgeEntryId,
          tenantId,
          userId
        );
      } catch (e) {
        // Ignore errors - entry might already be deleted
      }
    }

    // Ensure knowledge group exists
    const knowledgeGroupId = await ensureMainCharacterGroup(tenantId, userId);

    // Generate markdown from interview
    const markdown = generateInterviewMarkdown(session);

    // Create knowledge entry with embeddings
    const result = await extractKnowledgeFromText({
      tenantId,
      title: `Interview: ${session.name}`,
      text: markdown,
      knowledgeGroupId,
      userId,
      userOwned: false, // Shared across tenant
      generateSummary: false, // We have the full transcript
      metadata: {
        type: "interview",
        interviewId: session.id,
        interviewName: session.name,
        language: session.transcript.language,
        duration: session.meta?.duration,
        createdAt: session.createdAt,
      },
    });

    if (!result.ok) {
      return { success: false, error: "Failed to create knowledge entry" };
    }

    // Update interview session with reference to knowledge entry
    await updateInterviewSession(interviewId, tenantId, {
      meta: {
        knowledgeEntryId: result.id,
        knowledgeGroupId,
        knowledgeEmbeddedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      knowledgeEntryId: result.id,
      knowledgeGroupId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remove the knowledge embedding for an interview.
 * 
 * @param interviewId - Interview session ID
 * @param tenantId - Tenant ID
 * @param userId - User ID performing the action
 */
export async function removeInterviewEmbedding(
  interviewId: string,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getInterviewSessionById(interviewId, tenantId);
    if (!session) {
      return { success: false, error: "Interview session not found" };
    }

    if (!session.meta?.knowledgeEntryId) {
      return { success: true }; // Nothing to remove
    }

    // Delete the knowledge entry
    await deleteKnowledgeEntry(
      session.meta.knowledgeEntryId,
      tenantId,
      userId
    );

    // Update interview session to remove reference
    await updateInterviewSession(interviewId, tenantId, {
      meta: {
        knowledgeEntryId: undefined,
        knowledgeGroupId: undefined,
        knowledgeEmbeddedAt: undefined,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the main-character knowledge group ID for a tenant.
 * Returns null if it doesn't exist.
 */
export async function getMainCharacterGroupId(
  tenantId: string
): Promise<string | null> {
  const db = getDb();

  const groups = await db
    .select({ id: knowledgeGroup.id })
    .from(knowledgeGroup)
    .where(
      and(
        eq(knowledgeGroup.tenantId, tenantId),
        eq(knowledgeGroup.name, MAIN_CHARACTER_GROUP_NAME)
      )
    )
    .limit(1);

  return groups[0]?.id || null;
}

/**
 * Check if an interview has been embedded.
 */
export function isInterviewEmbedded(session: InterviewSessionsSelect): boolean {
  return !!session.meta?.knowledgeEntryId;
}
