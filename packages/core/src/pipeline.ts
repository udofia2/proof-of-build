import type {
	PipelineStage,
	PipelineStageDefinition,
} from "@proof-of-build/schemas";

/**
 * Pipeline stage definitions in order
 */
export const PIPELINE_STAGES: readonly PipelineStageDefinition[] = [
	{
		stage: "ingest",
		name: "Ingest Artifacts",
		description: "Read artifacts from R2 storage",
		required: true,
		order: 0,
	},
	{
		stage: "classify",
		name: "Classify Artifacts",
		description: "Classify artifacts by type (screenshot, terminal, log)",
		required: true,
		order: 1,
	},
	{
		stage: "generate-script",
		name: "Generate Script",
		description: "Generate narration script using AI",
		required: true,
		order: 2,
	},
	{
		stage: "generate-audio",
		name: "Generate Audio",
		description: "Generate audio narration using ElevenLabs",
		required: true,
		order: 3,
	},
	{
		stage: "assemble",
		name: "Assemble",
		description: "Assemble final project",
		required: true,
		order: 4,
	},
	{
		stage: "ready",
		name: "Ready",
		description: "Project is ready for playback",
		required: false,
		order: 5,
	},
	{
		stage: "error",
		name: "Error",
		description: "Error state",
		required: false,
		order: -1, // Error can occur at any stage
	},
] as const;

/**
 * Get the next stage in the pipeline
 */
export function getNextStage(
	currentStage: PipelineStage,
): PipelineStage | null {
	const current = PIPELINE_STAGES.find((s) => s.stage === currentStage);
	if (!current) return null;

	const next = PIPELINE_STAGES.find(
		(s) => s.order === current.order + 1 && s.stage !== "error",
	);
	return next ? next.stage : null;
}

/**
 * Get stage definition by stage name
 */
export function getStageDefinition(
	stage: PipelineStage,
): PipelineStageDefinition | undefined {
	return PIPELINE_STAGES.find((s) => s.stage === stage);
}

/**
 * Check if a stage is valid
 */
export function isValidStage(stage: string): stage is PipelineStage {
	return PIPELINE_STAGES.some((s) => s.stage === stage);
}

/**
 * Get all required stages (excluding error and ready)
 */
export function getRequiredStages(): PipelineStage[] {
	return PIPELINE_STAGES.filter((s) => s.required && s.stage !== "error")
		.map((s) => s.stage)
		.filter((s): s is PipelineStage => s !== "ready");
}
