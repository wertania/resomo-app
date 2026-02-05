import { mistral } from "@ai-sdk/mistral";

/**
 * The standard AI model to use for all AI operations
 */
export const STANDARD_AI_MODEL = mistral('mistral-large-latest');

/**
 * Export all AI tools
 */
export * from './character-chat';