import { z } from "zod";
import { ProjectIdSchema } from "./project.js";

/**
 * Pipeline stage enumeration
 */
export const PipelineStageSchema = z.enum([
	"ingest",
	"classify",
	"generate-script",
	"generate-audio",
	"assemble",
	"ready",
	"error",
]);

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

/**
 * Error state details
 */
export const ErrorStateSchema = z.object({
	stage: PipelineStageSchema,
	message: z.string(),
	code: z.string().optional(),
	timestamp: z.string().datetime(),
	details: z.record(z.unknown()).optional(),
});

export type ErrorState = z.infer<typeof ErrorStateSchema>;

/**
 * State file structure - orchestration + error state
 * Written to state/{project_id}.json
 */
export const StateSchema = z.object({
	projectId: ProjectIdSchema,
	stage: PipelineStageSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	error: ErrorStateSchema.optional(),
	metadata: z
		.object({
			scriptGenerated: z.boolean().default(false),
			audioGenerated: z.boolean().default(false),
			artifactsProcessed: z.number().int().nonnegative().default(0),
		})
		.optional(),
});

export type State = z.infer<typeof StateSchema>;
