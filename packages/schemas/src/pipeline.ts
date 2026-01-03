import { z } from "zod";
import { PipelineStageSchema } from "./state.js";

/**
 * Pipeline stage definition
 */
export const PipelineStageDefinitionSchema = z.object({
	stage: PipelineStageSchema,
	name: z.string(),
	description: z.string().optional(),
	required: z.boolean().default(true),
	order: z.number().int().nonnegative(),
});

export type PipelineStageDefinition = z.infer<
	typeof PipelineStageDefinitionSchema
>;

/**
 * Pipeline configuration
 */
export const PipelineConfigSchema = z.object({
	stages: z.array(PipelineStageDefinitionSchema),
	version: z.literal("1.0").default("1.0"),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
