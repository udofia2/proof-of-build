import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createManifest, validateProjectId } from "@proof-of-build/core";
import type { ArtifactCollection } from "@proof-of-build/schemas";
import { Command } from "commander";
import { getR2BucketName, validateWranglerAuth } from "../utils/config.js";
import { buildManifestKey, uploadToR2 } from "../utils/r2-upload.js";

export function manifestCommand(): Command {
	const command = new Command("manifest");

	command
		.description("Generate and upload manifest.json (completion signal)")
		.requiredOption("-p, --project <projectId>", "Project ID")
		.option(
			"-b, --bucket <bucket>",
			`R2 bucket name (default: ${getR2BucketName()} or R2_BUCKET_NAME env var)`,
		)
		.option(
			"--artifacts-file <path>",
			"Path to JSON file with artifact metadata (from upload command)",
		)
		.action(async (options) => {
			try {
				// Validate Wrangler authentication
				validateWranglerAuth();

				const projectId = validateProjectId(options.project);
				const bucket = options.bucket || getR2BucketName();
				console.log(`\n📝 Generating manifest for project: ${projectId}`);
				console.log(`   Bucket: ${bucket}`);

				let artifactCollection: ArtifactCollection;

				if (options.artifactsFile) {
					// Read artifact collection from file (stored during upload)
					console.log(`\n📂 Reading artifacts from: ${options.artifactsFile}`);
					const artifactsData = await readFile(options.artifactsFile, "utf-8");
					artifactCollection = JSON.parse(artifactsData) as ArtifactCollection;
				} else {
					// For now, create empty manifest - user should provide artifacts file
					// or we can enhance this to query R2 in the future
					console.log(
						"\n⚠️  No artifacts file provided. Creating manifest with empty artifact list.",
					);
					console.log(
						"   Note: In a full implementation, this would query R2 for uploaded artifacts.",
					);
					console.log(
						"   For now, run 'upload' command first, which will save artifact metadata.",
					);
					artifactCollection = {
						screenshots: [],
						terminal: [],
						logs: [],
					};
				}

				// Create manifest
				const manifest = createManifest(projectId, artifactCollection);

				// Write manifest to temp file, then upload
				const tempFile = join(tmpdir(), `manifest-${projectId}.json`);
				await writeFile(tempFile, JSON.stringify(manifest, null, 2));

				const manifestKey = buildManifestKey(projectId);
				console.log(`\n🚀 Uploading manifest.json to R2...`);
				await uploadToR2(bucket, manifestKey, tempFile);

				// Clean up temp file
				await unlink(tempFile);

				console.log(`\n✅ Manifest uploaded successfully!`);
				console.log(`\n📊 Manifest summary:`);
				console.log(`   Screenshots: ${artifactCollection.screenshots.length}`);
				console.log(`   Terminal files: ${artifactCollection.terminal.length}`);
				console.log(`   Log files: ${artifactCollection.logs.length}`);
				console.log(`   Total files: ${manifest.metadata?.totalFiles || 0}`);
				console.log(`\n🎉 Project ${projectId} is ready for processing!`);
				console.log(
					`   The manifest.json completion signal has been sent to R2.`,
				);
				console.log(
					`   The Worker will process this project when it detects the manifest.`,
				);
			} catch (error) {
				console.error(
					"❌ Error:",
					error instanceof Error ? error.message : String(error),
				);
				process.exit(1);
			}
		});

	return command;
}
