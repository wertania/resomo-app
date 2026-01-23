/**
 * Business logic for knowledge wiki management
 * All database operations and business logic are separated from API layer
 */

import { getDb } from "@framework/lib/db/db-connection";
import { knowledgeText } from "@framework/lib/db/schema/knowledge";
import { eq, and, isNull, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

/**
 * Recursively get all child knowledge entries (subs) of a given entry
 * Note: parentId in knowledgeText stores the id of the parent entry
 */
async function getAllChildEntries(
  parentId: string,
  tenantId: string,
  visitedIds: Set<string> = new Set()
) {
  // Prevent infinite loops
  if (visitedIds.has(parentId)) {
    return [];
  }
  visitedIds.add(parentId);

  // Get all direct children (where parentId = parent's id) sorted alphabetically
  const children = await getDb()
    .select()
    .from(knowledgeText)
    .where(
      and(
        eq(knowledgeText.parentId, parentId),
        eq(knowledgeText.tenantId, tenantId),
        isNull(knowledgeText.deletedAt)
      )
    )
    .orderBy(asc(knowledgeText.title));

  // Recursively get children of children
  const allChildren: (typeof knowledgeText.$inferSelect)[] = [...children];
  for (const child of children) {
    const grandChildren = await getAllChildEntries(
      child.id,
      tenantId,
      visitedIds
    );
    allChildren.push(...grandChildren);
  }

  return allChildren;
}

/**
 * Build markdown document from knowledge entries (Wiki)
 */
export async function buildWikiDocument(
  entryId: string,
  tenantId: string,
  userId: string
): Promise<string> {
  // Get the root entry by id
  const rootEntry = await getDb()
    .select()
    .from(knowledgeText)
    .where(
      and(
        eq(knowledgeText.id, entryId),
        eq(knowledgeText.tenantId, tenantId),
        isNull(knowledgeText.deletedAt)
      )
    )
    .limit(1);

  if (rootEntry.length === 0) {
    throw new HTTPException(404, {
      message: "Knowledge entry not found",
    });
  }

  const root = rootEntry[0]!; // Safe: we checked length above

  // Basic access check: user must have access to tenant
  // Additional checks can be added here if needed (teamId, userId, etc.)
  // For now, we'll allow access if the entry exists and user is in the tenant

  // Get all child entries recursively
  const childEntries = await getAllChildEntries(root.id, tenantId);

  // Build document: start with root entry
  const parts: string[] = [];

  const rootText = root.text;
  parts.push(`# ${root.title}`);
  if (rootText) {
    parts.push(rootText);
  }

  // Add all child entries
  for (const childEntry of childEntries) {
    const childText = childEntry.text;
    parts.push(`\n# ${childEntry.title}`);
    if (childText) {
      parts.push(childText);
    }
  }

  return parts.join("\n\n");
}
