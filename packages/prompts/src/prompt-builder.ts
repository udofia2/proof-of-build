/**
 * Prompt Builder Utilities
 * 
 * Helper functions for building prompts from artifacts and metadata
 */

import { buildScriptGenerationPrompt } from "./v1/script-generation.js";
import type { ArtifactCollection } from "@proof-of-build/schemas";

export interface PromptOptions {
	tone?: "professional" | "casual" | "technical" | "friendly";
	language?: string;
}

/**
 * Build a script generation prompt from artifacts
 */
export function buildPrompt(
	projectId: string,
	artifacts: ArtifactCollection,
	options?: PromptOptions,
): string {
	return buildScriptGenerationPrompt({
		projectId,
		artifacts,
		tone: options?.tone,
		language: options?.language,
	});
}

/**
 * Export all prompt builders
 */
export { buildScriptGenerationPrompt } from "./v1/script-generation.js";

