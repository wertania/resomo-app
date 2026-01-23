/**
 * Helper functions for wiki/knowledge text operations
 * Provides utility functions for ensuring wiki structure exists
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "@framework/lib/db/db-connection";
import { knowledgeText } from "@framework/lib/db/schema/knowledge";
import { createKnowledgeText } from "@framework/lib/knowledge/knowledge-texts";

/**
 * Find a child entry by title under a given parent
 */
export async function findChildByTitle(
  parentId: string,
  title: string,
  tenantId: string
): Promise<{ id: string; title: string } | null> {
  const result = await getDb()
    .select({ id: knowledgeText.id, title: knowledgeText.title })
    .from(knowledgeText)
    .where(
      and(
        eq(knowledgeText.parentId, parentId),
        eq(knowledgeText.title, title),
        eq(knowledgeText.tenantId, tenantId)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Ensure a wiki entry exists under a parent.
 * If it doesn't exist, create it.
 * Returns the entry ID.
 */
export async function ensureWikiEntryExists(params: {
  parentId: string;
  title: string;
  tenantId: string;
  userId: string;
  text?: string;
  hidden?: boolean;
}): Promise<string> {
  const { parentId, title, tenantId, userId, text = "", hidden = false } = params;

  // Check if entry already exists
  const existing = await findChildByTitle(parentId, title, tenantId);

  if (existing) {
    return existing.id;
  }

  // Create new entry
  const newEntry = await createKnowledgeText({
    tenantId,
    userId,
    parentId,
    title,
    text,
    tenantWide: false, // Personal wiki entries
    hidden,
  });

  return newEntry.id;
}

/**
 * Generate a protocol entry title with timestamp
 * Format: yyyy-mm-dd_hh-mm_protocol
 */
export function generateProtocolTitle(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}_protocol`;
}

/**
 * Format protocol content with frontmatter and sections
 */
export function formatProtocolContent(params: {
  summary: string;
  original: string;
  createdAt?: Date;
}): string {
  const { summary, original, createdAt = new Date() } = params;
  const isoDate = createdAt.toISOString();

  return `---
type: protocol
created_at: ${isoDate}
---

# Summary

${summary}

# Original

${original}
`;
}
