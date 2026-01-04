import type { Ai } from "@cloudflare/workers-types";
import { ScriptSchema, type Script, type ArtifactCollection } from "@proof-of-build/schemas";
import { buildPrompt } from "@proof-of-build/prompts";

/**
 * Cloudflare Workers AI Implementation
 * 
 * Uses Cloudflare Workers AI for script generation.
 * Requires AI binding in wrangler.toml: [ai] binding = "AI"
 */
export class WorkersAIClient {
	private ai: Ai;
	private model: string;

	constructor(ai: Ai, model: string = "@cf/meta/llama-3.1-8b-instruct") {
		this.ai = ai;
		this.model = model;
	}

	/**
	 * Generate a script from artifacts using Workers AI
	 */
	async generateScript(
		projectId: string,
		artifacts: ArtifactCollection,
		options?: {
			tone?: "professional" | "casual" | "technical" | "friendly";
			language?: string;
		},
	): Promise<Script> {
		// Build prompt
		const prompt = buildPrompt(projectId, artifacts, options);

		// Call Workers AI
		const response = await this.ai.run(this.model, {
			prompt,
			max_tokens: 2000,
		});

		// Extract text from response
		// Workers AI returns different formats depending on model
		let text: string;
		if (typeof response === "string") {
			text = response;
		} else if (response && typeof response === "object") {
			// Try common response formats
			if ("response" in response && typeof response.response === "string") {
				text = response.response;
			} else if ("text" in response && typeof response.text === "string") {
				text = response.text;
			} else if ("description" in response && typeof response.description === "string") {
				text = response.description;
			} else {
				// Fallback: stringify and try to extract JSON
				text = JSON.stringify(response);
			}
		} else {
			throw new Error("Unexpected response format from Workers AI");
		}

		// Try to extract JSON from the response
		// AI might return markdown code blocks or plain text with JSON
		let jsonText = text.trim();

		// Remove markdown code blocks if present
		if (jsonText.startsWith("```")) {
			const lines = jsonText.split("\n");
			// Find the JSON part (skip first line with ```json or ```)
			const jsonStart = lines.findIndex((line) => line.trim().startsWith("{"));
			const jsonEnd = lines.findLastIndex((line) => line.trim() === "```");
			if (jsonStart >= 0 && jsonEnd > jsonStart) {
				jsonText = lines.slice(jsonStart, jsonEnd).join("\n");
			} else if (jsonStart >= 0) {
				jsonText = lines.slice(jsonStart).join("\n");
			}
		}

		// Parse JSON
		let scriptData: unknown;
		try {
			scriptData = JSON.parse(jsonText);
		} catch (error) {
			// If JSON parsing fails, try to extract JSON object from text
			const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				scriptData = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error(
					`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Add projectId and createdAt
		const scriptWithMetadata = {
			projectId,
			createdAt: new Date().toISOString(),
			...scriptData,
		};

		// Validate and return
		return ScriptSchema.parse(scriptWithMetadata);
	}
}

