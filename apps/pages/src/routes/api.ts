import { Hono } from "hono";
import { validateState, validateManifest } from "@proof-of-build/core";
import type { State, Manifest, ProjectId } from "@proof-of-build/schemas";

/**
 * API Routes for Proof-of-Build Pages
 * All routes are read-only (no R2 mutations)
 */

export function createApiRoutes() {
	const api = new Hono<{ Bindings: CloudflareBindings }>();

	/**
	 * Get project state
	 * GET /api/project/:id/state
	 */
	api.get("/project/:id/state", async (c) => {
		const projectId = c.req.param("id") as ProjectId;
		const bucket = c.env.UPLOADS_BUCKET;

		try {
			const stateKey = `state/${projectId}.json`;
			const stateObj = await bucket.get(stateKey);

			if (!stateObj) {
				// No state file exists - return processing state
				return c.json({
					projectId,
					stage: "ingest",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					metadata: {
						scriptGenerated: false,
						audioGenerated: false,
						artifactsProcessed: 0,
					},
				} as State);
			}

			const stateData = await stateObj.json<State>();
			const state = validateState(stateData);

			return c.json(state);
		} catch (error) {
			console.error(`Error reading state for ${projectId}:`, error);
			return c.json(
				{
					error: "Failed to read state",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	});

	/**
	 * Get project manifest
	 * GET /api/project/:id/manifest
	 */
	api.get("/project/:id/manifest", async (c) => {
		const projectId = c.req.param("id") as ProjectId;
		const bucket = c.env.UPLOADS_BUCKET;

		try {
			const manifestKey = `uploads/${projectId}/manifest.json`;
			const manifestObj = await bucket.get(manifestKey);

			if (!manifestObj) {
				return c.json(
					{
						error: "Manifest not found",
						message: `No manifest found for project ${projectId}`,
					},
					404,
				);
			}

			const manifestData = await manifestObj.json<Manifest>();
			const manifest = validateManifest(manifestData);

			return c.json(manifest);
		} catch (error) {
			console.error(`Error reading manifest for ${projectId}:`, error);
			return c.json(
				{
					error: "Failed to read manifest",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	});

	/**
	 * Generate presigned URL for an asset
	 * GET /api/project/:id/presigned-url?key=<r2-key>
	 * Returns a temporary signed URL that allows direct access to R2 (expires in 1 hour)
	 */
	api.get("/project/:id/presigned-url", async (c) => {
		const projectId = c.req.param("id") as ProjectId;
		const key = c.req.query("key");

		if (!key) {
			return c.json({ error: "Missing key parameter" }, 400);
		}

		// Check if R2 API credentials are available
		const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
		const accessKeyId = c.env.R2_ACCESS_KEY_ID;
		const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;

		// If credentials not available, fall back to proxy route
		if (!accountId || !accessKeyId || !secretAccessKey) {
			return c.json({
				url: `/api/project/${projectId}/asset?key=${encodeURIComponent(key)}`,
				method: "proxy", // Indicates fallback to proxy
			});
		}

		try {
			// Generate presigned URL using aws4fetch
			const { AwsClient } = await import("aws4fetch");
			const client = new AwsClient({
				service: "s3",
				region: "auto",
				accessKeyId,
				secretAccessKey,
			});

			const r2Url = `https://${accountId}.r2.cloudflarestorage.com`;
			const bucketName = "proof-of-build-uploads";
			const expiresIn = 3600; // 1 hour
			const url = `${r2Url}/${bucketName}/${key}?X-Amz-Expires=${expiresIn}`;

			const signedRequest = await client.sign(new Request(url), {
				aws: { signQuery: true },
			});

			return c.json({
				url: signedRequest.url,
				method: "presigned",
				expiresIn,
			});
		} catch (error) {
			console.error(`Error generating presigned URL for ${key}:`, error);
			// Fall back to proxy route on error
			return c.json({
				url: `/api/project/${projectId}/asset?key=${encodeURIComponent(key)}`,
				method: "proxy",
			});
		}
	});

	/**
	 * Proxy asset from R2 (fallback when presigned URLs aren't available)
	 * GET /api/project/:id/asset?key=<r2-key>
	 * This serves assets directly from R2 (read-only)
	 */
	api.get("/project/:id/asset", async (c) => {
		const projectId = c.req.param("id") as ProjectId;
		const key = c.req.query("key");

		if (!key) {
			return c.json({ error: "Missing key parameter" }, 400);
		}

		const bucket = c.env.UPLOADS_BUCKET;

		try {
			const object = await bucket.get(key);

			if (!object) {
				return c.json({ error: "Asset not found" }, 404);
			}

			// Get content type from object metadata or infer from filename
			const contentType =
				object.httpMetadata?.contentType ||
				(key.endsWith(".png")
					? "image/png"
					: key.endsWith(".jpg") || key.endsWith(".jpeg")
						? "image/jpeg"
						: key.endsWith(".m4a") || key.endsWith(".mp3")
							? "audio/mpeg"
							: key.endsWith(".json")
								? "application/json"
								: "application/octet-stream");

			// Return the object as a response
			return new Response(object.body, {
				headers: {
					"Content-Type": contentType,
					"Cache-Control": "public, max-age=3600",
				},
			});
		} catch (error) {
			console.error(`Error fetching asset ${key}:`, error);
			return c.json(
				{
					error: "Failed to fetch asset",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	});

	return api;
}

