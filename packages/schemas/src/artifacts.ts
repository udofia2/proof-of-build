import { z } from "zod";

/**
 * Artifact type enumeration
 */
export const ArtifactTypeSchema = z.enum(["screenshot", "terminal", "log"]);

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

/**
 * Individual artifact metadata
 */
export const ArtifactSchema = z.object({
	type: ArtifactTypeSchema,
	path: z.string(), // Relative path within the project directory
	filename: z.string(),
	size: z.number().int().nonnegative().optional(),
	uploadedAt: z.string().datetime().optional(),
	order: z.number().int().nonnegative().optional(), // For ordering screenshots/terminal output
});

export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * Collection of artifacts grouped by type
 */
export const ArtifactCollectionSchema = z.object({
	screenshots: z.array(ArtifactSchema).default([]),
	terminal: z.array(ArtifactSchema).default([]),
	logs: z.array(ArtifactSchema).default([]),
});

export type ArtifactCollection = z.infer<typeof ArtifactCollectionSchema>;
