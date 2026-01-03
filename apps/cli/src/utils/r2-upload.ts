import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Upload a file to R2 using Wrangler CLI
 */
export async function uploadToR2(
	bucket: string,
	key: string,
	localFilePath: string,
): Promise<void> {
	// Wrangler command: wrangler r2 object put <bucket>/<key> --file=<local-file>
	const command = `wrangler r2 object put ${bucket}/${key} --file="${localFilePath}"`;

	try {
		const { stderr } = await execAsync(command);
		if (stderr && !stderr.includes("Upload complete")) {
			console.warn(`Warning: ${stderr}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to upload ${localFilePath} to R2: ${errorMessage}`);
	}
}

/**
 * Upload multiple files to R2 (sequential to avoid rate limits)
 */
export async function uploadFilesToR2(
	bucket: string,
	uploads: Array<{ key: string; localPath: string }>,
): Promise<void> {
	for (const upload of uploads) {
		await uploadToR2(bucket, upload.key, upload.localPath);
	}
}

/**
 * Build R2 key path according to ARCHITECTURE.md Section 3
 */
export function buildR2Key(
	projectId: string,
	artifactType: "screenshot" | "terminal" | "log",
	filename: string,
): string {
	const typeDir =
		artifactType === "screenshot"
			? "frames"
			: artifactType === "terminal"
				? "terminal"
				: "logs";

	return `uploads/${projectId}/${typeDir}/${filename}`;
}

/**
 * Build R2 key for manifest.json
 */
export function buildManifestKey(projectId: string): string {
	return `uploads/${projectId}/manifest.json`;
}

/**
 * List R2 objects in a prefix using Wrangler CLI
 * Note: Wrangler may not have a direct "list" command for objects.
 * This implementation attempts to use wrangler, but may need to fall back
 * to storing artifact metadata during upload phase.
 */
export async function listR2Objects(
	_bucket: string,
	_prefix: string,
): Promise<Array<{ key: string; size: number }>> {
	// Note: Wrangler doesn't have a direct "r2 object list" command
	// We'll need to use an alternative approach:
	// Option 1: Store artifact metadata during upload (recommended)
	// Option 2: Use R2 API directly (requires credentials)
	// For now, we'll throw a helpful error suggesting the upload command stores metadata

	throw new Error(
		`R2 object listing not yet implemented. ` +
			`The manifest command should be run immediately after upload, ` +
			`or artifact metadata should be stored during upload phase. ` +
			`This will be enhanced in a future update.`,
	);
}
