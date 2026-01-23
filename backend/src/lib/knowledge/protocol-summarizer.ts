/**
 * AI-powered protocol summarization
 * Generates concise summaries of transcripts in the original language
 */

import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";

/**
 * System prompt for protocol summarization
 */
const SUMMARIZATION_SYSTEM_PROMPT = `You are a helpful assistant that creates concise summaries of transcripts.

IMPORTANT RULES:
- Summarize the content in the SAME LANGUAGE as the original transcript
- Keep the summary concise but capture all key points
- Use bullet points for multiple items if appropriate
- Do not add any commentary or meta-information
- Just provide the summary directly`;

/**
 * Generate a summary of the transcript in the original language
 */
export async function generateProtocolSummary(
  transcript: string
): Promise<string> {
  const result = await generateText({
    model: mistral("mistral-large-latest"),
    messages: [
      {
        role: "system",
        content: SUMMARIZATION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Please summarize the following transcript:\n\n${transcript}`,
      },
    ],
  });

  return result.text;
}
