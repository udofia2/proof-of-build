import { z } from "zod";
import { ArtifactCollectionSchema } from "./artifacts.js";
import { ProjectIdSchema } from "./project.js";

/**
 * Manifest.json structure - the completion signal
 * This is the ONLY valid signal that artifacts are ready to process
 */
export const ManifestSchema = z.object({
	projectId: ProjectIdSchema,
	version: z.literal("1.0").default("1.0"),
	createdAt: z.string().datetime(),
	artifacts: ArtifactCollectionSchema,
	metadata: z
		.object({
			totalFiles: z.number().int().nonnegative(),
			totalSize: z.number().int().nonnegative().optional(),
		})
		.optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;
