import type { ArtifactCollection } from "@proof-of-build/schemas";

/**
 * Version 1.0 Script Generation Prompt Template
 * 
 * This prompt is used to generate narration scripts from development artifacts.
 * The prompt includes file lists, ordering hints, and persona/tone guidance.
 */

export interface ScriptGenerationPromptInput {
	artifacts: ArtifactCollection;
	projectId: string;
	tone?: "professional" | "casual" | "technical" | "friendly";
	language?: string;
}

/**
 * Build a prompt for script generation
 */
export function buildScriptGenerationPrompt(
	input: ScriptGenerationPromptInput,
): string {
	const { artifacts, projectId, tone = "professional", language = "en" } = input;

	// Build file lists
	const screenshotList = artifacts.screenshots
		.map((s, idx) => {
			const order = s.order ?? idx + 1;
			return `  ${order}. ${s.filename}${s.size ? ` (${s.size} bytes)` : ""}`;
		})
		.join("\n");

	const terminalList = artifacts.terminal
		.map((t, idx) => {
			const order = t.order ?? idx + 1;
			return `  ${order}. ${t.filename}${t.size ? ` (${t.size} bytes)` : ""}`;
		})
		.join("\n");

	const logList = artifacts.logs
		.map((l) => `  - ${l.filename}${l.size ? ` (${l.size} bytes)` : ""}`)
		.join("\n");

	// Count totals
	const totalScreenshots = artifacts.screenshots.length;
	const totalTerminal = artifacts.terminal.length;
	const totalLogs = artifacts.logs.length;

	// Build prompt
	const prompt = `You are a technical narrator creating a video script for a development project demonstration.

PROJECT ID: ${projectId}

ARTIFACTS PROVIDED:
${totalScreenshots > 0 ? `Screenshots (${totalScreenshots}):\n${screenshotList}\n` : ""}${totalTerminal > 0 ? `Terminal Output (${totalTerminal}):\n${terminalList}\n` : ""}${totalLogs > 0 ? `Log Files (${totalLogs}):\n${logList}\n` : ""}

TASK:
Generate a narration script that explains what the developer built, following the order of screenshots and terminal output. The script should:
1. Introduce the project briefly
2. Walk through each screenshot/terminal output in order
3. Explain what's happening at each step
4. Highlight key features or achievements
5. Conclude with a summary

TONE: ${tone}
LANGUAGE: ${language}

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "segments": [
    {
      "text": "Narration text for this segment",
      "startTime": 0.0,
      "duration": 5.0,
      "frameIndex": 0
    }
  ],
  "totalDuration": 30.0,
  "metadata": {
    "tone": "${tone}",
    "language": "${language}"
  }
}

RULES:
- Each segment should correspond to a screenshot or terminal output
- startTime is in seconds from the start of the video
- duration is in seconds for this segment
- frameIndex is the 0-based index of the screenshot (optional, only if segment corresponds to a screenshot)
- Segments should flow naturally and be easy to narrate
- Keep each segment between 3-8 seconds of narration
- Total duration should be reasonable (typically 30-120 seconds for most projects)
- Use clear, concise language appropriate for the ${tone} tone

Generate the script now:`;

	return prompt;
}

