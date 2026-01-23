/**
 * Business logic for knowledge text merge operations
 * Provides tools for LLM agent to analyze and edit knowledge texts
 */

import { getDb } from "@framework/lib/db/db-connection";
import { knowledgeText, knowledgeTextHistory } from "@framework/lib/db/schema/knowledge";
import { eq, and, isNull, sql } from "drizzle-orm";

export interface ViewTextParams {
  entryId: string;
  tenantId: string;
  startLine?: number;
  endLine?: number;
}

export interface StrReplaceParams {
  oldStr: string;
  newStr: string;
}

export interface InsertParams {
  lineNumber: number;
  text: string;
}

export type EditOperation =
  | {
      op: "str_replace";
      old_str: string;
      new_str: string;
    }
  | {
      op: "insert";
      line_number: number;
      text: string;
    };

export interface TextMergeResult {
  edits: EditOperation[];
}

/**
 * Get knowledge text content by entry ID
 * Returns the text content split into lines
 */
export async function getKnowledgeText(
  entryId: string,
  tenantId: string
): Promise<string> {
  const entry = await getDb()
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

  if (entry.length === 0) {
    throw new Error("Knowledge text entry not found");
  }

  return entry[0]!.text;
}

/**
 * View text or text excerpt for LLM tool
 * Returns text with line numbers for precise editing
 */
export async function viewText(params: ViewTextParams): Promise<string> {
  const text = await getKnowledgeText(params.entryId, params.tenantId);
  const lines = text.split("\n");

  const startLine = params.startLine ?? 1;
  const endLine = params.endLine ?? lines.length;

  // Validate line numbers
  if (startLine < 1 || startLine > lines.length) {
    throw new Error(
      `Invalid startLine: ${startLine}. Text has ${lines.length} lines.`
    );
  }
  if (endLine < startLine || endLine > lines.length) {
    throw new Error(
      `Invalid endLine: ${endLine}. Must be between ${startLine} and ${lines.length}.`
    );
  }

  // Extract the requested lines (convert to 0-based index)
  const excerpt = lines.slice(startLine - 1, endLine);

  // Format with line numbers
  const formatted = excerpt
    .map((line, idx) => {
      const lineNum = startLine + idx;
      return `${lineNum.toString().padStart(4, " ")}| ${line}`;
    })
    .join("\n");

  return formatted;
}

/**
 * Validate string replacement operation
 * Ensures exactly one match exists
 */
export function validateStrReplace(
  text: string,
  oldStr: string
): { valid: boolean; matchCount: number; error?: string } {
  const matches = text.split(oldStr).length - 1;

  if (matches === 0) {
    return {
      valid: false,
      matchCount: 0,
      error: "String not found in text",
    };
  }

  if (matches > 1) {
    return {
      valid: false,
      matchCount: matches,
      error: `Multiple matches found (${matches}). Please provide more context to make the match unique.`,
    };
  }

  return { valid: true, matchCount: 1 };
}

/**
 * Apply string replacement operation
 * Replaces exactly one occurrence of oldStr with newStr
 */
export function applyStrReplace(
  text: string,
  params: StrReplaceParams
): string {
  const validation = validateStrReplace(text, params.oldStr);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return text.replace(params.oldStr, params.newStr);
}

/**
 * Apply insert operation
 * Inserts text at specified line number
 */
export function applyInsert(text: string, params: InsertParams): string {
  const lines = text.split("\n");

  if (params.lineNumber < 1 || params.lineNumber > lines.length + 1) {
    throw new Error(
      `Invalid line number: ${params.lineNumber}. Text has ${lines.length} lines.`
    );
  }

  // Insert at line (convert to 0-based index)
  lines.splice(params.lineNumber - 1, 0, params.text);

  return lines.join("\n");
}

/**
 * Apply a list of edit operations to text
 * Validates all operations before applying any
 */
export async function applyEditOperations(
  entryId: string,
  tenantId: string,
  operations: EditOperation[]
): Promise<{ text: string; appliedCount: number }> {
  let text = await getKnowledgeText(entryId, tenantId);
  let appliedCount = 0;

  for (const op of operations) {
    try {
      if (op.op === "str_replace") {
        text = applyStrReplace(text, {
          oldStr: op.old_str,
          newStr: op.new_str,
        });
        appliedCount++;
      } else if (op.op === "insert") {
        text = applyInsert(text, {
          lineNumber: op.line_number,
          text: op.text,
        });
        appliedCount++;
      }
    } catch (error) {
      throw new Error(
        `Failed to apply operation ${JSON.stringify(op)}: ${(error as Error).message}`
      );
    }
  }

  return { text, appliedCount };
}

/**
 * Save updated text to knowledge entry
 * Creates a history entry before updating
 */
export async function saveKnowledgeText(
  entryId: string,
  tenantId: string,
  userId: string,
  newText: string
): Promise<void> {
  const db = getDb();

  // Get current entry
  const currentEntry = await db
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

  if (currentEntry.length === 0) {
    throw new Error("Knowledge text entry not found");
  }

  const current = currentEntry[0]!;

  // Create history entry with current state BEFORE updating
  await db.insert(knowledgeTextHistory).values({
    knowledgeTextId: current.id,
    tenantId: current.tenantId,
    tenantWide: current.tenantWide,
    teamId: current.teamId,
    userId: current.userId,
    parentId: current.parentId,
    text: current.text,
    title: current.title,
    meta: current.meta,
    hidden: current.hidden,
  });

  // Update the entry with new text
  await db
    .update(knowledgeText)
    .set({ 
      text: newText,
      updatedAt: sql`now()`
    })
    .where(eq(knowledgeText.id, entryId));
}
