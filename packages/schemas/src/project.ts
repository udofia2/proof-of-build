import { z } from "zod";

/**
 * Project ID schema - must be a valid string identifier
 */
export const ProjectIdSchema = z.string().min(1).max(255);

export type ProjectId = z.infer<typeof ProjectIdSchema>;

/**
 * Project metadata schema
 */
export const ProjectMetadataSchema = z.object({
	id: ProjectIdSchema,
	createdAt: z.string().datetime().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
});

export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
