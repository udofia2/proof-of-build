import type { Script, ArtifactCollection } from "@proof-of-build/schemas";

/**
 * AI Client Interface
 * 
 * Abstract interface for AI script generation.
 * Implementations can use Workers AI, OpenAI, or other providers.
 */
export interface AIClient {
	/**
	 * Generate a script from artifacts
	 * @param projectId - Project identifier
	 * @param artifacts - Collection of artifacts (screenshots, terminal, logs)
	 * @param options - Optional generation options
	 * @returns Generated script with segments and timing
	 */
	generateScript(
		projectId: string,
		artifacts: ArtifactCollection,
		options?: {
			tone?: "professional" | "casual" | "technical" | "friendly";
			language?: string;
		},
	): Promise<Script>;
}

