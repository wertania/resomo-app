/**
 * Interview Speaker Type Analyzer
 * AI-powered agent that analyzes interview speakers and identifies their roles.
 * Uses Vercel AI SDK v6 with Valibot for structured output.
 */

import { generateText, Output } from "ai";
import { mistral } from "@ai-sdk/mistral";
import * as v from "valibot";
import type { InterviewSessionsSelect } from "../../db/tables/interview-sessions";
import { generateInterviewMarkdown } from "./index";
import { valibotSchema } from '@ai-sdk/valibot';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/**
 * Result schema for speaker type analysis
 */
const SpeakerTypeAnalysisSchema = v.object({
  speakerTypes: v.record(
    v.string(),
    v.picklist(["interviewee", "host"]),
  ),
  reasoning: v.optional(
    v.string(),
    "Optional explanation of the analysis"
  ),
});

export type SpeakerTypeAnalysisResult = v.InferOutput<typeof SpeakerTypeAnalysisSchema>;

/**
 * Validate that Mistral API key is configured
 */
export function validateMistralConfig(): void {
  if (!MISTRAL_API_KEY) {
    throw new Error("Mistral API key is not configured");
  }
}

/**
 * Build the system prompt for the speaker type analyzer
 */
function buildSystemPrompt(): string {
  return `You are an expert interview analyst. Your task is to analyze interview transcripts and identify the role of each speaker.

**Speaker Types:**
- **host**: The person conducting the interview, asking questions, leading the conversation
- **interviewee**: The person being interviewed, providing answers, sharing their story/experience

**Analysis Guidelines:**
1. Hosts typically:
   - Ask questions
   - Guide the conversation
   - Provide transitions between topics
   - Use phrases like "Can you tell us about...", "What do you think about...", "How did you..."

2. Interviewees typically:
   - Answer questions
   - Share personal experiences
   - Provide detailed information
   - Respond to the host's prompts

3. If a speaker's role is ambiguous, use context clues like:
   - The flow of conversation
   - Who initiates new topics
   - The balance of speaking time
   - The nature of their statements (questions vs. answers)

**Output:**
Return a JSON object mapping each speaker ID to their type ("interviewee" or "host").
Include a brief reasoning to explain your analysis.`;
}

/**
 * Build the user prompt with the interview transcript
 */
function buildUserPrompt(markdown: string, speakerIds: string[]): string {
  return `Analyze the following interview transcript and identify the role of each speaker.

**Speakers to analyze:**
${speakerIds.map(id => `- Speaker ID: ${id}`).join("\n")}

**Interview Transcript:**
${markdown}

Please identify each speaker as either "interviewee" or "host".`;
}

/**
 * Analyze speaker types in an interview using AI
 * @param session - Interview session with transcript
 * @returns Speaker type analysis result
 */
export async function analyzeSpeakerTypes(
  session: InterviewSessionsSelect
): Promise<SpeakerTypeAnalysisResult> {
  validateMistralConfig();

  if (!session.transcript) {
    throw new Error("Interview session has no transcript");
  }

  // Extract unique speaker IDs from transcript
  const speakerIds = Array.from(
    new Set(session.transcript.segments.map(s => s.speaker.id))
  );

  if (speakerIds.length === 0) {
    throw new Error("No speakers found in transcript");
  }

  // Generate markdown for analysis
  const markdown = generateInterviewMarkdown(session);

  // Run AI analysis with structured output
  const result = await generateText({
    model: mistral("mistral-large-latest"),
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(markdown, speakerIds),
    output: Output.object({
      schema: valibotSchema(SpeakerTypeAnalysisSchema),
    }),
  });

  return result.output;
}
