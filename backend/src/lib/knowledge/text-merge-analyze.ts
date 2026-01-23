/**
 * Business logic for LLM-powered knowledge text analysis
 * Uses AI agent with tools to analyze user input and generate edit operations
 */

import { tool, jsonSchema, Output, ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { viewText, getKnowledgeText, type EditOperation } from "./text-merge";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/**
 * Parameters for text merge analysis
 */
export interface AnalyzeTextMergeParams {
  entryId: string;
  tenantId: string;
  userInput: string;
}

/**
 * Result of text merge analysis
 */
export interface AnalyzeTextMergeResult {
  edits: EditOperation[];
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
 * Create the view tool for the LLM agent
 */
function createViewTool(entryId: string, tenantId: string) {
  type ViewToolParams = {
    startLine?: number;
    endLine?: number;
  };

  return tool<ViewToolParams, string>({
    description:
      "View the current knowledge text content with line numbers. You can optionally specify a range of lines to view.",
    inputSchema: jsonSchema<ViewToolParams>({
      type: "object",
      properties: {
        startLine: {
          type: "number",
          description: "Start line number (default: 1)",
        },
        endLine: {
          type: "number",
          description: "End line number (default: last line)",
        },
      },
    }),
    execute: async (params: ViewToolParams): Promise<string> => {
      console.log("params for tool call viewText", params);
      const text = await viewText({
        entryId,
        tenantId,
        startLine: params.startLine,
        endLine: params.endLine,
      });

      console.log("text for tool call viewText", text);

      return text;
    },
  });
}

/**
 * Create the JSON schema for edit operations output
 */
function createEditOperationsSchema() {
  return jsonSchema<{
    edits: Array<
      | {
          op: "str_replace";
          old_str: string;
          new_str: string;
        }
      | {
          op: "insert";
          line_number: number;
          text: string;
        }
    >;
  }>({
    type: "object",
    properties: {
      edits: {
        type: "array",
        items: {
          oneOf: [
            {
              type: "object",
              properties: {
                op: { type: "string", enum: ["str_replace"] },
                old_str: { type: "string" },
                new_str: { type: "string" },
              },
              required: ["op", "old_str", "new_str"],
            },
            {
              type: "object",
              properties: {
                op: { type: "string", enum: ["insert"] },
                line_number: { type: "number" },
                text: { type: "string" },
              },
              required: ["op", "line_number", "text"],
            },
          ],
        },
      },
    },
    required: ["edits"],
  });
}

/**
 * Build the system instructions for the LLM agent
 */
function buildAgentInstructions(lineCount: number): string {
  return `You are a precise text editing agent that works like a code editor assistant. Your task is to interpret user requests as FUNCTIONAL REQUIREMENTS and generate exact edit operations.

CRITICAL MINDSET:
- Treat user input as SEMANTIC INTENT, not literal text to copy
- The user describes WHAT they want changed, not HOW it should be written
- You must ADAPT the change to match the document's existing format, structure, and style
- Example: User says "There is a new contact person X in project Y"
  → Don't insert "There is a new contact person X"
  → Instead, find where contacts are listed and update the existing format
  → If it says "Contact: Z", replace with "Contact: X"
  → If it's a bullet list, add as bullet point
  → Match the document's conventions exactly

WORKFLOW:
1. Use the 'view' tool to see the current document with line numbers
2. Analyze the document's structure, format, and style conventions
3. Interpret the user's semantic intent (WHAT they want to change)
4. Locate the relevant section in the document
5. Generate edits that preserve the document's existing format and style
6. Be surgical - only change what's necessary

DOCUMENT ANALYSIS:
- Identify format patterns: markdown headings, lists, tables, key-value pairs
- Detect style conventions: spacing, capitalization, punctuation
- Recognize structure: sections, subsections, hierarchies
- Understand context: where information logically belongs

ADAPTATION RULES:
- If document uses "Name: Value" format, preserve it
- If document uses bullet lists, add/update as bullet items
- If document uses tables, maintain table structure
- Match heading levels based on content hierarchy
- Preserve indentation, spacing, and line break patterns
- Keep the same tone: formal vs. informal, technical vs. casual
- Place new information in the most logical location within existing structure

The document has ${lineCount} lines.

EDIT OPERATIONS:
- str_replace: Replace exact string with new string (most common for updates)
  - old_str must match EXACTLY (including whitespace and newlines)
  - Include surrounding context to make the match unique
  - Must match exactly one location in the document
  - Use for updating existing information

- insert: Insert new text at specific line number (only for new sections)
  - line_number: Where to insert (1-based)
  - text: The text to insert (adapted to document style)
  - Use only when adding completely new content that doesn't replace anything

PRECISION REQUIREMENTS:
- Include exact whitespace, newlines, and indentation in old_str
- Ensure matches are unique - add context if needed
- Test mentally: would this match exactly once in the document?
- Don't change formatting unless the user explicitly requests it

Output format:
{
  "edits": [
    {
      "op": "str_replace",
      "old_str": "exact text including whitespace and newlines",
      "new_str": "replacement text in same format"
    }
  ]
}`;
}

/**
 * Build the user prompt for the LLM agent
 */
function buildUserPrompt(userInput: string): string {
  return `SEMANTIC CHANGE REQUEST (interpret as functional requirement, not literal text):
${userInput}

TASK:
1. Use the view tool to analyze the document structure and existing format
2. Interpret the semantic intent: WHAT does the user want to change?
3. Locate WHERE in the document this change belongs
4. Generate edit operations that adapt the change to the document's existing style and format
5. Be surgical - preserve all existing formatting patterns and conventions

Remember: The user input describes the INTENT of the change. Your job is to translate that intent into edits that look native to the document.`;
}

/**
 * Analyze user input and generate edit operations using LLM agent
 */
export async function analyzeTextMerge(
  params: AnalyzeTextMergeParams
): Promise<AnalyzeTextMergeResult> {
  const { entryId, tenantId, userInput } = params;

  // Validate configuration
  validateMistralConfig();

  // Get the current text to provide context
  const currentText = await getKnowledgeText(entryId, tenantId);
  const lines = currentText.split("\n");
  const lineCount = lines.length;

  // Create the view tool
  const viewTool = createViewTool(entryId, tenantId);

  // Create the edit operations schema
  const editOperationsSchema = createEditOperationsSchema();

  // Create the LLM agent
  const agent = new ToolLoopAgent({
    model: mistral("mistral-large-latest"),
    instructions: buildAgentInstructions(lineCount),
    tools: {
      view: viewTool,
    },
    output: Output.object({
      schema: editOperationsSchema,
    }),
  });

  // Generate edit operations using LLM with tools
  const result = await agent.generate({
    prompt: buildUserPrompt(userInput),
  });

  console.log("result for tool call generateText", result);

  return result.output;
}
