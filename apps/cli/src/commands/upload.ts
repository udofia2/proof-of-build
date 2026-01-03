import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createArtifact,
	extractOrderFromFilename,
	sortArtifacts,
	validateProjectId,
} from "@proof-of-build/core";
import type { ArtifactCollection } from "@proof-of-build/schemas";
import { Command } from "commander";
import { getR2BucketName, validateWranglerAuth } from "../utils/config.js";
import { isDirectory, readDirectoryRecursive } from "../utils/file-system.js";
import { buildR2Key, uploadFilesToR2 } from "../utils/r2-upload.js";

export function uploadCommand(): Command {
	const command = new Command("upload");

	command
		.description("Upload artifacts (screenshots, terminal output, logs) to R2")
		.requiredOption(
			"-p, --project <projectId>",
			"Project ID (get this from 'init' command)",
		)
		.option(
			"-f, --frames <path>",
			"Path to directory containing screenshot files (PNG, JPG, etc.)",
		)
		.option(
			"-t, --terminal <path>",
			"Path to directory containing terminal output files (.txt)",
		)
		.option(
			"-l, --logs <path>",
			"Path to directory containing log files (.log)",
		)
		.option(
			"-b, --bucket <bucket>",
			`R2 bucket name (default: ${getR2BucketName()} or R2_BUCKET_NAME env var)`,
		)
		.action(async (options) => {
			try {
				// Validate Wrangler authentication
				validateWranglerAuth();

				const projectId = validateProjectId(options.project);
				const bucket = options.bucket || getR2BucketName();
				console.log(`\n📤 Uploading artifacts for project: ${projectId}`);
				console.log(`   Bucket: ${bucket}`);

				// Check that at least one artifact type is provided
				if (!options.frames && !options.terminal && !options.logs) {
					console.error(
						"\n❌ Error: At least one artifact type must be specified",
					);
					console.error(
						"   Use --frames, --terminal, or --logs to specify artifact directories",
					);
					process.exit(1);
				}

				const artifactCollection: ArtifactCollection = {
					screenshots: [],
					terminal: [],
					logs: [],
				};

				const uploads: Array<{ key: string; localPath: string }> = [];

				// Process frames/screenshots
				if (options.frames) {
					if (!(await isDirectory(options.frames))) {
						throw new Error(
							`Frames path is not a directory: ${options.frames}`,
						);
					}

					console.log(`\n📸 Processing screenshots from: ${options.frames}`);
					const files = await readDirectoryRecursive(options.frames);

					for (const file of files) {
						const artifact = createArtifact(
							file.filepath,
							file.filename,
							file.size,
							extractOrderFromFilename(file.filename),
						);

						if (artifact && artifact.type === "screenshot") {
							artifactCollection.screenshots.push(artifact);
							const r2Key = buildR2Key(projectId, "screenshot", file.filename);
							uploads.push({
								key: r2Key,
								localPath: join(options.frames, file.filepath),
							});
						}
					}

					// Sort screenshots by order
					artifactCollection.screenshots = sortArtifacts(
						artifactCollection.screenshots,
					);
					console.log(
						`   Found ${artifactCollection.screenshots.length} screenshot(s)`,
					);
				}

				// Process terminal output
				if (options.terminal) {
					if (!(await isDirectory(options.terminal))) {
						throw new Error(
							`Terminal path is not a directory: ${options.terminal}`,
						);
					}

					console.log(
						`\n💻 Processing terminal output from: ${options.terminal}`,
					);
					const files = await readDirectoryRecursive(options.terminal);

					for (const file of files) {
						const artifact = createArtifact(
							file.filepath,
							file.filename,
							file.size,
							extractOrderFromFilename(file.filename),
						);

						if (artifact && artifact.type === "terminal") {
							artifactCollection.terminal.push(artifact);
							const r2Key = buildR2Key(projectId, "terminal", file.filename);
							uploads.push({
								key: r2Key,
								localPath: join(options.terminal, file.filepath),
							});
						}
					}

					// Sort terminal files by order
					artifactCollection.terminal = sortArtifacts(
						artifactCollection.terminal,
					);
					console.log(
						`   Found ${artifactCollection.terminal.length} terminal file(s)`,
					);
				}

				// Process logs
				if (options.logs) {
					if (!(await isDirectory(options.logs))) {
						throw new Error(`Logs path is not a directory: ${options.logs}`);
					}

					console.log(`\n📋 Processing logs from: ${options.logs}`);
					const files = await readDirectoryRecursive(options.logs);

					for (const file of files) {
						const artifact = createArtifact(
							file.filepath,
							file.filename,
							file.size,
						);

						if (artifact && artifact.type === "log") {
							artifactCollection.logs.push(artifact);
							const r2Key = buildR2Key(projectId, "log", file.filename);
							uploads.push({
								key: r2Key,
								localPath: join(options.logs, file.filepath),
							});
						}
					}

					console.log(`   Found ${artifactCollection.logs.length} log file(s)`);
				}

				// Upload all files to R2
				console.log(
					`\n🚀 Uploading ${uploads.length} file(s) to R2 bucket: ${bucket}`,
				);
				let uploaded = 0;
				for (const upload of uploads) {
					process.stdout.write(`   Uploading ${upload.key}... `);
					await uploadFilesToR2(bucket, [upload]);
					uploaded++;
					console.log(`✓ (${uploaded}/${uploads.length})`);
				}

				console.log(`\n✅ Upload complete!`);
				console.log(`\n📊 Summary:`);
				console.log(`   Screenshots: ${artifactCollection.screenshots.length}`);
				console.log(`   Terminal files: ${artifactCollection.terminal.length}`);
				console.log(`   Log files: ${artifactCollection.logs.length}`);

				// Save artifact collection to temp file for manifest command
				const artifactsFile = join(tmpdir(), `artifacts-${projectId}.json`);
				await writeFile(
					artifactsFile,
					JSON.stringify(artifactCollection, null, 2),
				);

				console.log(
					`\n💡 Next step: Run 'manifest' command to generate manifest.json`,
				);
				console.log(
					`   proof-of-build manifest --project ${projectId} --artifacts-file ${artifactsFile}`,
				);
				console.log(`\n   (Artifact metadata saved to: ${artifactsFile})`);
			} catch (error) {
				console.error(
					"\n❌ Error:",
					error instanceof Error ? error.message : String(error),
				);
				process.exit(1);
			}
		});

	return command;
}
