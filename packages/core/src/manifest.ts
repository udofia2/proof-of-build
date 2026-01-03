import {
	type ArtifactCollection,
	type Manifest,
	ManifestSchema,
	type ProjectId,
} from "@proof-of-build/schemas";

/**
 * Create a manifest from artifacts
 */
export function createManifest(
	projectId: ProjectId,
	artifacts: ArtifactCollection,
): Manifest {
	const totalFiles =
		artifacts.screenshots.length +
		artifacts.terminal.length +
		artifacts.logs.length;

	const totalSize =
		artifacts.screenshots.reduce((sum, a) => sum + (a.size || 0), 0) +
		artifacts.terminal.reduce((sum, a) => sum + (a.size || 0), 0) +
		artifacts.logs.reduce((sum, a) => sum + (a.size || 0), 0);

	const manifest: Manifest = {
		projectId,
		version: "1.0",
		createdAt: new Date().toISOString(),
		artifacts,
		metadata: {
			totalFiles,
			totalSize: totalSize > 0 ? totalSize : undefined,
		},
	};

	// Validate before returning
	return ManifestSchema.parse(manifest);
}

/**
 * Validate a manifest object
 * Returns the validated manifest or throws
 */
export function validateManifest(data: unknown): Manifest {
	return ManifestSchema.parse(data);
}

/**
 * Check if data is a valid manifest
 */
export function isValidManifest(data: unknown): boolean {
	return ManifestSchema.safeParse(data).success;
}
