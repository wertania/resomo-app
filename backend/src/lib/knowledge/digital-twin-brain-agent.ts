/**
 * Digital Twin Brain Agent
 * AI-powered agent that processes protocols and merges key facts into the digital twin knowledge structure.
 * 
 * The digital twin brain is organized as a wiki with max 3 levels:
 * - Level 0: Entry point (digital twin root) - managed by system
 * - Level 1: Main categories - managed by USER (agent cannot create/modify)
 * - Level 2 & 3: Subcategories - managed by AGENT (max 10 per level)
 * 
 * The agent extracts key facts from protocols and merges them into the appropriate
 * categories, creating new subcategories as needed.
 */

import { tool, jsonSchema, Output, ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { getDb } from "@framework/lib/db/db-connection";
import { knowledgeText, knowledgeTextHistory } from "@framework/lib/db/schema/knowledge";
import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { createKnowledgeText } from "@framework/lib/knowledge/knowledge-texts";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// Fallback category that must always exist
const FALLBACK_CATEGORY_NAME = "90_other";

/**
 * Parameters for processing a protocol
 */
export interface ProcessProtocolParams {
  entryPointId: string;
  tenantId: string;
  userId: string;
  protocol: string;
}

/**
 * Result of protocol processing
 */
export interface ProcessProtocolResult {
  success: boolean;
  processedFacts: number;
  updatedCategories: string[];
  newCategories: string[];
  errors: string[];
}

/**
 * Wiki entry structure for YAML output
 */
interface WikiEntry {
  id: string;
  title: string;
  children?: WikiEntry[];
}

/**
 * Validate that Mistral API key is configured
 */
export function validateMistralConfig(): void {
  if (!MISTRAL_API_KEY) {
    throw new Error("Mistral API key is not configured");
  }
}

/**
 * Get direct children of a wiki entry (titles only)
 */
async function getChildrenTitles(
  parentId: string,
  tenantId: string
): Promise<{ id: string; title: string }[]> {
  const children = await getDb()
    .select({ id: knowledgeText.id, title: knowledgeText.title })
    .from(knowledgeText)
    .where(
      and(
        eq(knowledgeText.parentId, parentId),
        eq(knowledgeText.tenantId, tenantId),
        isNull(knowledgeText.deletedAt)
      )
    )
    .orderBy(asc(knowledgeText.title));

  return children;
}

/**
 * Get wiki structure recursively as YAML-like format
 */
async function getWikiStructureDeep(
  parentId: string,
  tenantId: string,
  currentDepth: number = 0,
  maxDepth: number = 3
): Promise<WikiEntry[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const children = await getChildrenTitles(parentId, tenantId);
  const result: WikiEntry[] = [];

  for (const child of children) {
    const entry: WikiEntry = {
      id: child.id,
      title: child.title,
    };

    // Recursively get children
    const grandChildren = await getWikiStructureDeep(
      child.id,
      tenantId,
      currentDepth + 1,
      maxDepth
    );

    if (grandChildren.length > 0) {
      entry.children = grandChildren;
    }

    result.push(entry);
  }

  return result;
}

/**
 * Format wiki structure as YAML string
 */
function formatAsYaml(entries: WikiEntry[], indent: number = 0): string {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const entry of entries) {
    lines.push(`${prefix}- id: "${entry.id}"`);
    lines.push(`${prefix}  title: "${entry.title}"`);

    if (entry.children && entry.children.length > 0) {
      lines.push(`${prefix}  children:`);
      lines.push(formatAsYaml(entry.children, indent + 2));
    }
  }

  return lines.join("\n");
}

/**
 * Format wiki structure as simple markdown list (titles only)
 */
function formatAsTitleList(entries: { id: string; title: string }[]): string {
  return entries.map((e) => `- ${e.title} (id: ${e.id})`).join("\n");
}

/**
 * Get wiki entry text content
 */
async function getWikiEntryText(
  entryId: string,
  tenantId: string,
  startLine?: number,
  endLine?: number
): Promise<string> {
  const entry = await getDb()
    .select({ text: knowledgeText.text, title: knowledgeText.title })
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
    throw new Error(`Wiki entry not found: ${entryId}`);
  }

  const text = entry[0]!.text;
  const lines = text.split("\n");

  // Apply line range if specified
  if (startLine !== undefined || endLine !== undefined) {
    const start = (startLine ?? 1) - 1;
    const end = endLine ?? lines.length;
    const excerpt = lines.slice(start, end);

    // Format with line numbers
    return excerpt
      .map((line, idx) => {
        const lineNum = start + idx + 1;
        return `${lineNum.toString().padStart(4, " ")}| ${line}`;
      })
      .join("\n");
  }

  return text;
}

/**
 * Check if an entry is at level 1 (direct child of entry point)
 */
async function isLevel1Entry(
  entryId: string,
  entryPointId: string,
  tenantId: string
): Promise<boolean> {
  const entry = await getDb()
    .select({ parentId: knowledgeText.parentId })
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
    return false;
  }

  return entry[0]!.parentId === entryPointId;
}

/**
 * Get the depth level of an entry relative to the entry point
 * Returns 0 for entry point, 1 for direct children, etc.
 */
async function getEntryDepth(
  entryId: string,
  entryPointId: string,
  tenantId: string,
  maxDepth: number = 5
): Promise<number> {
  if (entryId === entryPointId) {
    return 0;
  }

  let currentId = entryId;
  let depth = 0;

  while (depth < maxDepth) {
    const entry = await getDb()
      .select({ parentId: knowledgeText.parentId })
      .from(knowledgeText)
      .where(
        and(
          eq(knowledgeText.id, currentId),
          eq(knowledgeText.tenantId, tenantId),
          isNull(knowledgeText.deletedAt)
        )
      )
      .limit(1);

    if (entry.length === 0 || !entry[0]!.parentId) {
      return -1; // Entry not found or no parent
    }

    depth++;

    if (entry[0]!.parentId === entryPointId) {
      return depth;
    }

    currentId = entry[0]!.parentId;
  }

  return -1; // Max depth exceeded
}

/**
 * Create the read_structure tool for the agent
 */
function createReadStructureTool(entryPointId: string, tenantId: string) {
  type ReadStructureParams = {
    parentId?: string;
    deep?: boolean;
  };

  return tool<ReadStructureParams, string>({
    description: `Read the wiki structure of the digital twin brain.
    
Parameters:
- parentId: The ID of the parent entry to read children from. If empty/null, reads from the entry point (root).
- deep: If true, returns the full recursive structure as YAML. If false (default), returns only direct children as a markdown list.

Returns:
- If deep=false: A markdown list of direct children with their IDs and titles
- If deep=true: A YAML structure showing the full hierarchy (up to 3 levels)

Use this to understand the existing category structure before deciding where to place new facts.`,
    inputSchema: jsonSchema<ReadStructureParams>({
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description:
            "Parent entry ID. Leave empty to read from entry point (root of digital twin).",
        },
        deep: {
          type: "boolean",
          description:
            "If true, returns full recursive YAML structure. Default: false (returns only direct children).",
        },
      },
    }),
    execute: async (params: ReadStructureParams): Promise<string> => {
      const targetParentId = params.parentId || entryPointId;
      const deep = params.deep ?? false;

      if (deep) {
        const structure = await getWikiStructureDeep(targetParentId, tenantId);
        if (structure.length === 0) {
          return "No children found under this entry.";
        }
        return `\`\`\`yaml\n${formatAsYaml(structure)}\n\`\`\``;
      } else {
        const children = await getChildrenTitles(targetParentId, tenantId);
        if (children.length === 0) {
          return "No children found under this entry.";
        }
        return formatAsTitleList(children);
      }
    },
  });
}

/**
 * Create the read_text tool for the agent
 */
function createReadTextTool(tenantId: string) {
  type ReadTextParams = {
    entryId: string;
    startLine?: number;
    endLine?: number;
  };

  return tool<ReadTextParams, string>({
    description: `Read the text content of a wiki entry.
    
Parameters:
- entryId: The ID of the wiki entry to read (required)
- startLine: Optional start line number (1-based)
- endLine: Optional end line number (1-based)

Returns the text content. If line numbers are specified, returns only that range with line numbers prefixed.

Use this to read existing content before deciding how to merge new facts.`,
    inputSchema: jsonSchema<ReadTextParams>({
      type: "object",
      properties: {
        entryId: {
          type: "string",
          description: "The ID of the wiki entry to read",
        },
        startLine: {
          type: "number",
          description: "Start line number (1-based, optional)",
        },
        endLine: {
          type: "number",
          description: "End line number (1-based, optional)",
        },
      },
      required: ["entryId"],
    }),
    execute: async (params: ReadTextParams): Promise<string> => {
      try {
        return await getWikiEntryText(
          params.entryId,
          tenantId,
          params.startLine,
          params.endLine
        );
      } catch (error) {
        return `Error reading entry: ${(error as Error).message}`;
      }
    },
  });
}

/**
 * Create the create_subcategory tool for the agent
 */
function createSubcategoryTool(
  entryPointId: string,
  tenantId: string,
  userId: string
) {
  type CreateSubcategoryParams = {
    parentId: string;
    title: string;
    initialContent?: string;
  };

  return tool<CreateSubcategoryParams, string>({
    description: `Create a new subcategory (wiki page) under an existing category.

IMPORTANT RESTRICTIONS:
- You CANNOT create entries directly under the entry point (level 0). Level 1 categories are managed by the USER only.
- You CAN create entries at level 2 (under level 1 categories) and level 3 (under level 2 categories).
- Maximum 10 subcategories per parent are recommended.
- Use descriptive, lowercase titles with underscores (e.g., "project_alpha", "meeting_notes").

Parameters:
- parentId: The ID of the parent entry (MUST be a level 1 or level 2 category, NOT the entry point)
- title: The title for the new subcategory
- initialContent: Optional initial text content

Returns the ID of the newly created entry, or an error message if creation is not allowed.`,
    inputSchema: jsonSchema<CreateSubcategoryParams>({
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description:
            "Parent entry ID. Must be a level 1 or level 2 category (NOT the entry point).",
        },
        title: {
          type: "string",
          description:
            "Title for the new subcategory. Use lowercase with underscores.",
        },
        initialContent: {
          type: "string",
          description: "Optional initial text content for the new entry.",
        },
      },
      required: ["parentId", "title"],
    }),
    execute: async (params: CreateSubcategoryParams): Promise<string> => {
      // Check if parentId is the entry point (not allowed)
      if (params.parentId === entryPointId) {
        return "ERROR: Cannot create entries directly under the entry point. Level 1 categories are managed by the user only. Please choose an existing level 1 category as parent.";
      }

      // Check the depth of the parent
      const parentDepth = await getEntryDepth(
        params.parentId,
        entryPointId,
        tenantId
      );

      if (parentDepth === -1) {
        return "ERROR: Parent entry not found or invalid.";
      }

      if (parentDepth === 0) {
        return "ERROR: Cannot create entries directly under the entry point. Level 1 categories are managed by the user only.";
      }

      if (parentDepth >= 3) {
        return "ERROR: Maximum depth of 3 levels reached. Cannot create deeper subcategories.";
      }

      // Check how many children the parent already has
      const existingChildren = await getChildrenTitles(params.parentId, tenantId);
      if (existingChildren.length >= 10) {
        return `WARNING: Parent already has ${existingChildren.length} children. Consider using existing subcategories instead of creating new ones.`;
      }

      // Check if a child with this title already exists
      const existingWithTitle = existingChildren.find(
        (c) => c.title.toLowerCase() === params.title.toLowerCase()
      );
      if (existingWithTitle) {
        return `Entry with title "${params.title}" already exists under this parent. Use ID: ${existingWithTitle.id}`;
      }

      try {
        const newEntry = await createKnowledgeText({
          tenantId,
          userId,
          parentId: params.parentId,
          title: params.title,
          text: params.initialContent || "",
          tenantWide: false,
          hidden: false,
        });

        return `Successfully created subcategory "${params.title}" with ID: ${newEntry.id}`;
      } catch (error) {
        return `ERROR creating subcategory: ${(error as Error).message}`;
      }
    },
  });
}

/**
 * Create the update_text tool for the agent
 */
function createUpdateTextTool(tenantId: string, userId: string) {
  type UpdateTextParams = {
    entryId: string;
    newContent: string;
    appendMode?: boolean;
  };

  return tool<UpdateTextParams, string>({
    description: `Update the text content of a wiki entry.

Parameters:
- entryId: The ID of the wiki entry to update (required)
- newContent: The new text content
- appendMode: If true, appends to existing content. If false (default), replaces entire content.

IMPORTANT:
- Always read the existing content first with read_text before updating
- When appending, the new content will be added after the existing content with a newline separator
- When replacing, be careful not to lose important existing information
- A history entry is automatically created before each update

Returns a success message or error.`,
    inputSchema: jsonSchema<UpdateTextParams>({
      type: "object",
      properties: {
        entryId: {
          type: "string",
          description: "The ID of the wiki entry to update",
        },
        newContent: {
          type: "string",
          description: "The new text content",
        },
        appendMode: {
          type: "boolean",
          description:
            "If true, appends to existing content. Default: false (replace).",
        },
      },
      required: ["entryId", "newContent"],
    }),
    execute: async (params: UpdateTextParams): Promise<string> => {
      const db = getDb();

      // Get current entry
      const currentEntry = await db
        .select()
        .from(knowledgeText)
        .where(
          and(
            eq(knowledgeText.id, params.entryId),
            eq(knowledgeText.tenantId, tenantId),
            isNull(knowledgeText.deletedAt)
          )
        )
        .limit(1);

      if (currentEntry.length === 0) {
        return `ERROR: Wiki entry not found: ${params.entryId}`;
      }

      const current = currentEntry[0]!;

      // Create history entry
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

      // Determine final content
      let finalContent: string;
      if (params.appendMode) {
        finalContent = current.text
          ? `${current.text}\n\n${params.newContent}`
          : params.newContent;
      } else {
        finalContent = params.newContent;
      }

      // Update the entry
      await db
        .update(knowledgeText)
        .set({
          text: finalContent,
          updatedAt: sql`now()`,
        })
        .where(eq(knowledgeText.id, params.entryId));

      return `Successfully updated entry "${current.title}" (${params.entryId})`;
    },
  });
}

/**
 * Ensure the fallback category (90_other) exists
 */
async function ensureFallbackCategory(
  entryPointId: string,
  tenantId: string,
  userId: string
): Promise<string> {
  const children = await getChildrenTitles(entryPointId, tenantId);
  const fallback = children.find((c) => c.title === FALLBACK_CATEGORY_NAME);

  if (fallback) {
    return fallback.id;
  }

  // Create the fallback category
  const newEntry = await createKnowledgeText({
    tenantId,
    userId,
    parentId: entryPointId,
    title: FALLBACK_CATEGORY_NAME,
    text: "# Other\n\nThis category contains miscellaneous facts that don't fit into other categories.",
    tenantWide: false,
    hidden: false,
  });

  return newEntry.id;
}

/**
 * Build the system instructions for the Digital Twin Brain Agent
 */
function buildAgentInstructions(categories: string): string {
  return `You are the Digital Twin Brain Agent. Your task is to process protocols (transcripts, meeting notes, etc.) and extract key facts to merge into a structured knowledge base.

## YOUR ROLE
You maintain a "digital brain" - a hierarchical wiki structure that stores important facts and information. When given a protocol, you must:
1. Extract only the KEY FACTS that are worth remembering
2. Determine the appropriate category for each fact
3. Merge the facts into existing entries or create new subcategories as needed

## KNOWLEDGE STRUCTURE
The digital brain has a maximum of 3 levels:
- **Level 1**: Main categories (e.g., "projects", "contacts", "decisions") - MANAGED BY USER, you CANNOT create or modify these
- **Level 2**: Subcategories under main categories - YOU CAN create and manage these (max 10 per category)
- **Level 3**: Sub-subcategories - YOU CAN create and manage these (max 10 per parent)

## EXISTING MAIN CATEGORIES (Level 1)
${categories}

## TOOLS AVAILABLE

### 1. read_structure
Use this to explore the wiki hierarchy. Start with deep=true to see the full structure, then drill down as needed.

### 2. read_text
Read the content of a specific wiki entry before updating it. ALWAYS read before writing to avoid losing information.

### 3. create_subcategory
Create new level 2 or level 3 entries. You CANNOT create level 1 entries (those are user-managed).

### 4. update_text
Update the content of a wiki entry. Use appendMode=true to add to existing content, or false to replace.

## WORKFLOW

1. **ANALYZE THE PROTOCOL**
   - Read the protocol carefully
   - Identify discrete facts, decisions, action items, contacts, dates, etc.
   - Filter out noise - only extract information worth remembering long-term

2. **EXPLORE THE STRUCTURE**
   - Use read_structure with deep=true to see the full hierarchy
   - Understand what categories and subcategories already exist

3. **FOR EACH FACT**
   - Determine which main category (level 1) it belongs to
   - Check if an appropriate subcategory exists
   - If yes: read the existing content, then update it (merge the new fact)
   - If no: create a new subcategory, then add the fact

4. **MERGING FACTS**
   - When updating existing entries, preserve the existing format
   - Use bullet points for lists of facts
   - Include dates when relevant
   - Be concise - store facts, not prose
   - If a fact updates existing information, replace the old with the new

## IMPORTANT RULES

1. **NEVER create level 1 categories** - use existing ones or put facts in "90_other"
2. **Maximum 10 subcategories per parent** - reuse existing ones when possible
3. **Always read before writing** - don't overwrite important information
4. **Extract facts, not summaries** - store discrete, searchable facts
5. **Use consistent naming** - lowercase with underscores (e.g., "project_alpha")
6. **Include context** - dates, people involved, source of information
7. **If unsure about category, use "90_other"** - it's the fallback for miscellaneous facts

## OUTPUT FORMAT

After processing, you must return a JSON object with:
{
  "processedFacts": <number of facts extracted and stored>,
  "updatedCategories": [<list of category titles that were updated>],
  "newCategories": [<list of new subcategories created>],
  "errors": [<list of any errors encountered>]
}

## EXAMPLE

Protocol: "Meeting with John from Acme Corp on 2024-01-15. They want to increase their order by 20%. Decision: Accept the new terms. Next meeting scheduled for February."

Actions:
1. read_structure(deep=true) - see existing structure
2. Find "contacts" category, check for "acme_corp" subcategory
3. If exists: read_text, then update_text with new meeting info
4. If not: create_subcategory "acme_corp", then update_text
5. Find "decisions" category, update with the new decision
6. Return summary of changes

Now process the protocol and merge the key facts into the digital brain.`;
}

/**
 * Build the user prompt for the agent
 */
function buildUserPrompt(protocol: string): string {
  return `## PROTOCOL TO PROCESS

${protocol}

---

Please analyze this protocol, extract the key facts, and merge them into the digital brain structure. Use the tools to explore the existing structure, create subcategories as needed, and update the appropriate entries.

Remember:
- Only extract facts worth remembering long-term
- Use existing categories when possible
- Create new subcategories only when necessary
- Always read before writing
- Return the summary JSON when done`;
}

/**
 * Process a protocol and merge facts into the digital twin brain
 */
export async function processProtocol(
  params: ProcessProtocolParams
): Promise<ProcessProtocolResult> {
  const { entryPointId, tenantId, userId, protocol } = params;

  // Validate configuration
  validateMistralConfig();

  // Ensure fallback category exists
  await ensureFallbackCategory(entryPointId, tenantId, userId);

  // Get existing main categories for context
  const mainCategories = await getChildrenTitles(entryPointId, tenantId);
  const categoriesContext =
    mainCategories.length > 0
      ? formatAsTitleList(mainCategories)
      : "No main categories exist yet. Use '90_other' as fallback.";

  // Create tools
  const readStructureTool = createReadStructureTool(entryPointId, tenantId);
  const readTextTool = createReadTextTool(tenantId);
  const createSubcategoryToolInstance = createSubcategoryTool(
    entryPointId,
    tenantId,
    userId
  );
  const updateTextTool = createUpdateTextTool(tenantId, userId);

  // Create result schema
  const resultSchema = jsonSchema<ProcessProtocolResult>({
    type: "object",
    properties: {
      success: { type: "boolean" },
      processedFacts: { type: "number" },
      updatedCategories: {
        type: "array",
        items: { type: "string" },
      },
      newCategories: {
        type: "array",
        items: { type: "string" },
      },
      errors: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "success",
      "processedFacts",
      "updatedCategories",
      "newCategories",
      "errors",
    ],
  });

  // Create the agent
  const agent = new ToolLoopAgent({
    model: mistral("mistral-large-latest"),
    instructions: buildAgentInstructions(categoriesContext),
    tools: {
      read_structure: readStructureTool,
      read_text: readTextTool,
      create_subcategory: createSubcategoryToolInstance,
      update_text: updateTextTool,
    },
    output: Output.object({
      schema: resultSchema,
    }),
  });

  // Process the protocol
  const result = await agent.generate({
    prompt: buildUserPrompt(protocol),
  });

  return result.output;
}
