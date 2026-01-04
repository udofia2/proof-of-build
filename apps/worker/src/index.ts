/**
 * Proof-of-Build Worker
 * 
 * TEMPORARY: Using polling worker instead of queues (free tier)
 * TODO: After 2 weeks, switch to queue-based implementation
 * 
 * This worker polls R2 for new manifest.json files and processes the pipeline.
 * Runs on a cron schedule (every 2 minutes) instead of being triggered by queue events.
 * 
 * ============================================================================
 * MIGRATION GUIDE: Switching from Polling to Queue (after moving to paid plan)
 * ============================================================================
 * 
 * 1. In infra/setup.sh:
 *    - Uncomment Step 2 (queue creation)
 *    - Uncomment Step 3 (event notification)
 *    - Comment out the "SKIPPED" messages
 * 
 * 2. In infra/wrangler/worker.toml:
 *    - Uncomment [[queues.consumers]] section
 *    - Comment out [triggers] cron section
 * 
 * 3. In apps/worker/src/index.ts:
 *    - Comment out the `scheduled` handler
 *    - Uncomment the `queue` handler
 *    - Remove `pollForNewManifests` function (no longer needed)
 * 
 * 4. Deploy:
 *    - Run: ./infra/setup.sh (to create queue and event notification)
 *    - Deploy worker: cd apps/worker && wrangler deploy
 * 
 * ============================================================================
 */

import {
	createErrorState,
	createInitialState,
	validateManifest,
	validateState,
} from "@proof-of-build/core";
import type { Manifest, ProjectId, State, Script } from "@proof-of-build/schemas";
import { WorkersAIClient } from "@proof-of-build/adapters-ai";
import { ElevenLabsClient } from "@proof-of-build/adapters-elevenlabs";

// Environment interface matching worker.toml bindings
interface Env {
	UPLOADS_BUCKET: R2Bucket;
	SCRIPTS_BUCKET: R2Bucket;
	AUDIO_BUCKET: R2Bucket;
	STATE_BUCKET: R2Bucket;
	AI: Ai; // Workers AI binding
	ELEVENLABS_API_KEY?: string;
	AI_API_KEY?: string;
}

/**
 * Build R2 key for manifest.json
 */
function buildManifestKey(projectId: ProjectId): string {
	return `uploads/${projectId}/manifest.json`;
}

/**
 * Build R2 key for state file
 */
function buildStateKey(projectId: ProjectId): string {
	return `state/${projectId}.json`;
}

/**
 * Build R2 key for script file
 */
function buildScriptKey(projectId: ProjectId): string {
	return `scripts/${projectId}.json`;
}

/**
 * Build R2 key for audio file
 */
function buildAudioKey(projectId: ProjectId): string {
	return `audio/${projectId}.m4a`;
}

/**
 * Extract project ID from manifest key path
 * Example: "uploads/project-123/manifest.json" -> "project-123"
 */
function extractProjectIdFromKey(key: string): ProjectId | null {
	const match = key.match(/^uploads\/([^\/]+)\/manifest\.json$/);
	return match ? (match[1] as ProjectId) : null;
}

/**
 * Check if a project has already been processed
 */
async function isProcessed(
	stateBucket: R2Bucket,
	projectId: ProjectId,
): Promise<boolean> {
	const stateKey = buildStateKey(projectId);
	const stateObj = await stateBucket.get(stateKey);
	if (!stateObj) {
		return false;
	}

	try {
		const stateData = await stateObj.json<State>();
		const state = validateState(stateData);
		// If state exists and is not in "ingest" stage, it's been processed
		return state.stage !== "ingest";
	} catch {
		// Invalid state, consider it not processed
		return false;
	}
}

/**
 * Get or create state for a project
 */
async function getOrCreateState(
	stateBucket: R2Bucket,
	projectId: ProjectId,
): Promise<State> {
	const stateKey = buildStateKey(projectId);
	const stateObj = await stateBucket.get(stateKey);

	if (stateObj) {
		const stateData = await stateObj.json<State>();
		return validateState(stateData);
	}

	// Create initial state
	const initialState = createInitialState(projectId);
	await stateBucket.put(stateKey, JSON.stringify(initialState));
	return initialState;
}

/**
 * Update state in R2
 */
async function updateState(
	stateBucket: R2Bucket,
	state: State,
): Promise<void> {
	const stateKey = buildStateKey(state.projectId);
	await stateBucket.put(stateKey, JSON.stringify(state));
}

/**
 * Generate script using AI
 */
async function generateScript(
	manifest: Manifest,
	env: Env,
): Promise<Script> {
	const aiClient = new WorkersAIClient(env.AI);
	const script = await aiClient.generateScript(manifest.projectId, manifest.artifacts, {
		tone: "professional",
		language: "en",
	});

	// Write script to R2
	const scriptKey = buildScriptKey(manifest.projectId);
	await env.SCRIPTS_BUCKET.put(scriptKey, JSON.stringify(script, null, 2), {
		httpMetadata: {
			contentType: "application/json",
		},
	});

	return script;
}

/**
 * Generate audio from script using ElevenLabs
 */
async function generateAudio(
	script: Script,
	env: Env,
): Promise<void> {
	if (!env.ELEVENLABS_API_KEY) {
		throw new Error("ELEVENLABS_API_KEY not configured");
	}

	// Combine all script segments into a single text
	const fullText = script.segments.map((segment) => segment.text).join(" ");

	if (!fullText || fullText.trim().length === 0) {
		throw new Error("Script text is empty, cannot generate audio");
	}

	const elevenLabsClient = new ElevenLabsClient({
		apiKey: env.ELEVENLABS_API_KEY,
	});

	const audioResponse = await elevenLabsClient.generateAudio(fullText, {
		outputFormat: "mp3_44100_128", // MP3 format (m4a equivalent quality)
	});

	// Write audio to R2
	const audioKey = buildAudioKey(script.projectId);
	await env.AUDIO_BUCKET.put(audioKey, audioResponse.audio, {
		httpMetadata: {
			contentType: audioResponse.contentType,
		},
	});
}

/**
 * Process a manifest (main pipeline logic)
 * Implements full pipeline: classify → generate-script → generate-audio → ready
 */
async function processManifest(
	manifest: Manifest,
	env: Env,
): Promise<void> {
	const state = await getOrCreateState(env.STATE_BUCKET, manifest.projectId);

	// If already processed, skip
	if (state.stage === "ready" || state.stage === "error") {
		return;
	}

	let currentState = state;

	try {
		// Stage 1: Classify (already done via manifest, but update state)
		if (currentState.stage === "ingest") {
			currentState = {
				...currentState,
				stage: "classify" as const,
				updatedAt: new Date().toISOString(),
			};
			await updateState(env.STATE_BUCKET, currentState);
		}

		// Stage 2: Generate script
		if (currentState.stage === "classify") {
			currentState = {
				...currentState,
				stage: "generate-script" as const,
				updatedAt: new Date().toISOString(),
			};
			await updateState(env.STATE_BUCKET, currentState);

			const script = await generateScript(manifest, env);

			// Update metadata
			currentState = {
				...currentState,
				metadata: {
					scriptGenerated: true,
					audioGenerated: currentState.metadata?.audioGenerated ?? false,
					artifactsProcessed: currentState.metadata?.artifactsProcessed ?? 0,
				},
				updatedAt: new Date().toISOString(),
			};
			await updateState(env.STATE_BUCKET, currentState);

			// Stage 3: Generate audio
			currentState = {
				...currentState,
				stage: "generate-audio" as const,
				updatedAt: new Date().toISOString(),
			};
			await updateState(env.STATE_BUCKET, currentState);

			await generateAudio(script, env);

			// Update metadata
			currentState = {
				...currentState,
				metadata: {
					scriptGenerated: currentState.metadata?.scriptGenerated ?? true,
					audioGenerated: true,
					artifactsProcessed: currentState.metadata?.artifactsProcessed ?? 0,
				},
				updatedAt: new Date().toISOString(),
			};
			await updateState(env.STATE_BUCKET, currentState);
		}

		// Stage 4: Mark as ready
		const readyState = {
			...currentState,
			stage: "ready" as const,
			updatedAt: new Date().toISOString(),
		};
		await updateState(env.STATE_BUCKET, readyState);
	} catch (error) {
		// Handle error - write error state
		const errorState = createErrorState(
			currentState,
			currentState.stage,
			error instanceof Error ? error.message : "Unknown error",
			"PIPELINE_ERROR",
			{ error: String(error), stage: currentState.stage },
		);
		await updateState(env.STATE_BUCKET, errorState);
		throw error;
	}
}

/**
 * Poll R2 for new manifest.json files
 */
async function pollForNewManifests(env: Env): Promise<void> {
	const uploadsBucket = env.UPLOADS_BUCKET;

	// List all objects in uploads/ prefix
	// Note: R2 list() doesn't support filtering by suffix directly,
	// so we'll list all objects and filter for manifest.json
	const objects = await uploadsBucket.list({
		prefix: "uploads/",
	});

	// Filter for manifest.json files
	const manifestKeys = objects.objects
		.map((obj) => obj.key)
		.filter((key) => key.endsWith("/manifest.json"));

	// Process each manifest
	for (const manifestKey of manifestKeys) {
		const projectId = extractProjectIdFromKey(manifestKey);
		if (!projectId) {
			continue; // Skip invalid keys
		}

		// Check if already processed
		if (await isProcessed(env.STATE_BUCKET, projectId)) {
			continue; // Skip already processed projects
		}

		try {
			// Fetch and validate manifest
			const manifestObj = await uploadsBucket.get(manifestKey);
			if (!manifestObj) {
				continue; // Manifest not found (shouldn't happen)
			}

			const manifestData = await manifestObj.json<Manifest>();
			const manifest = validateManifest(manifestData);

			// Process the manifest
			await processManifest(manifest, env);
		} catch (error) {
			// Log error but continue processing other manifests
			console.error(
				`Error processing manifest ${manifestKey}:`,
				error instanceof Error ? error.message : String(error),
			);
		}
	}
}

/**
 * Fetch handler (for HTTP requests)
 * Returns worker status information
 */
async function fetchHandler(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
): Promise<Response> {
	const url = new URL(request.url);

	// Health check endpoint
	if (url.pathname === "/health" || url.pathname === "/") {
		return new Response(
			JSON.stringify({
				status: "ok",
				service: "proof-of-build-worker",
				description: "Worker orchestrates the proof-of-build pipeline",
				mode: "polling",
				schedule: "*/2 * * * * (every 2 minutes)",
				endpoints: {
					health: "/health",
					status: "/status",
				},
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Status endpoint
	if (url.pathname === "/status") {
		// Count manifests in R2 (optional - can be slow)
		try {
			const uploadsBucket = env.UPLOADS_BUCKET;
			const objects = await uploadsBucket.list({ prefix: "uploads/" });
			const manifestCount = objects.objects.filter((obj) =>
				obj.key.endsWith("/manifest.json"),
			).length;

			return new Response(
				JSON.stringify({
					status: "ok",
					manifestsFound: manifestCount,
					lastPoll: "Check logs for last poll time",
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					status: "error",
					message: error instanceof Error ? error.message : "Unknown error",
				}),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	// 404 for unknown routes
	return new Response(
		JSON.stringify({
			error: "Not Found",
			message: "This worker only handles scheduled tasks. Use /health or /status endpoints.",
		}),
		{
			status: 404,
			headers: { "Content-Type": "application/json" },
		},
	);
}

/**
 * Scheduled handler (cron trigger)
 * TEMPORARY: This replaces the queue handler
 * TODO: After moving to paid plan, replace with queue handler
 */
export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		return fetchHandler(request, env, ctx);
	},

	async scheduled(
		event: ScheduledEvent,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		console.log(`[${new Date().toISOString()}] Polling for new manifests...`);

		try {
			await pollForNewManifests(env);
			console.log(`[${new Date().toISOString()}] Polling complete`);
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] Polling error:`,
				error instanceof Error ? error.message : String(error),
			);
			throw error; // Let cron trigger handle retries
		}
	},

	// TODO: After moving to paid plan, uncomment queue handler and comment out scheduled:
	// async queue(
	//   batch: MessageBatch<QueueMessage>,
	//   env: Env,
	//   ctx: ExecutionContext,
	// ): Promise<void> {
	//   for (const message of batch.messages) {
	//     try {
	//       const body = message.body as { key: string };
	//       const projectId = extractProjectIdFromKey(body.key);
	//       if (!projectId) continue;
	//
	//       const manifestObj = await env.UPLOADS_BUCKET.get(body.key);
	//       if (!manifestObj) continue;
	//
	//       const manifestData = await manifestObj.json<Manifest>();
	//       const manifest = validateManifest(manifestData);
	//       await processManifest(manifest, env);
	//
	//       message.ack();
	//     } catch (error) {
	//       console.error('Error processing queue message:', error);
	//       message.retry();
	//     }
	//   }
	// },
};

