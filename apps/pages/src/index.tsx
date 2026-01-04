import { Hono } from "hono";
import { renderer } from "./renderer";
import { createApiRoutes } from "./routes/api.js";
import { StateIndicator } from "./components/StateIndicator.js";
import { Player } from "./components/Player.js";
import type { State, Manifest, Script } from "@proof-of-build/schemas";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(renderer);

// Mount API routes
const api = createApiRoutes();
app.route("/api", api);

/**
 * Main playback page
 * GET /:id - View project playback
 */
app.get("/:id", async (c) => {
	const projectId = c.req.param("id");
	const bucket = c.env.UPLOADS_BUCKET;

	try {
		// Fetch state
		const stateKey = `state/${projectId}.json`;
		let state: State | null = null;
		try {
			const stateObj = await bucket.get(stateKey);
			if (stateObj) {
				const stateData = await stateObj.json<State>();
				state = stateData;
			}
		} catch (error) {
			console.error("Error reading state:", error);
		}

		// Default state if not found
		if (!state) {
			state = {
				projectId,
				stage: "ingest",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				metadata: {
					scriptGenerated: false,
					audioGenerated: false,
					artifactsProcessed: 0,
				},
			};
		}

		// Fetch manifest
		const manifestKey = `uploads/${projectId}/manifest.json`;
		let manifest: Manifest | null = null;
		try {
			const manifestObj = await bucket.get(manifestKey);
			if (manifestObj) {
				const manifestData = await manifestObj.json<Manifest>();
				manifest = manifestData;
			}
		} catch (error) {
			console.error("Error reading manifest:", error);
		}

		// Fetch script if ready
		let script: Script | null = null;
		if (state.stage === "ready") {
			try {
				const scriptKey = `scripts/${projectId}.json`;
				const scriptObj = await bucket.get(scriptKey);
				if (scriptObj) {
					const scriptData = await scriptObj.json<Script>();
					script = scriptData;
				}
			} catch (error) {
				console.error("Error reading script:", error);
			}
		}

		// Generate presigned URLs for assets (if credentials available)
		// Otherwise, fall back to proxy URLs
		const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
		const accessKeyId = c.env.R2_ACCESS_KEY_ID;
		const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;
		const hasCredentials = !!accountId && !!accessKeyId && !!secretAccessKey;

		let screenshotUrls: string[] = [];
		let audioUrl: string | null = null;

		if (manifest && hasCredentials) {
			try {
				const { AwsClient } = await import("aws4fetch");
				const client = new AwsClient({
					service: "s3",
					region: "auto",
					accessKeyId: accessKeyId!,
					secretAccessKey: secretAccessKey!,
				});

				const r2Url = `https://${accountId}.r2.cloudflarestorage.com`;
				const bucketName = "proof-of-build-uploads";
				const expiresIn = 3600; // 1 hour

				// Generate presigned URLs for screenshots
				screenshotUrls = await Promise.all(
					manifest.artifacts.screenshots.map(async (screenshot) => {
						const key = `uploads/${projectId}/frames/${screenshot.filename}`;
						const url = `${r2Url}/${bucketName}/${key}?X-Amz-Expires=${expiresIn}`;
						const signedRequest = await client.sign(new Request(url), {
							aws: { signQuery: true },
						});
						return signedRequest.url;
					}),
				);

				// Generate presigned URL for audio if ready
				if (state.stage === "ready") {
					const audioKey = `audio/${projectId}.m4a`;
					const url = `${r2Url}/${bucketName}/${audioKey}?X-Amz-Expires=${expiresIn}`;
					const signedRequest = await client.sign(new Request(url), {
						aws: { signQuery: true },
					});
					audioUrl = signedRequest.url;
				}
			} catch (error) {
				console.error("Error generating presigned URLs:", error);
				// Fall back to proxy URLs on error
			}
		}

		// Fall back to proxy URLs if presigned URLs failed or not available
		if (screenshotUrls.length === 0 && manifest) {
			screenshotUrls = manifest.artifacts.screenshots.map(
				(screenshot) =>
					`/api/project/${projectId}/asset?key=uploads/${projectId}/frames/${screenshot.filename}`,
			);
		}

		if (!audioUrl && state.stage === "ready") {
			audioUrl = `/api/project/${projectId}/asset?key=audio/${projectId}.m4a`;
		}

		return c.render(
			<div>
				<header
					style={{
						padding: "20px",
						borderBottom: "1px solid #ddd",
						marginBottom: "20px",
					}}
				>
					<h1 style={{ margin: "0 0 12px 0" }}>Proof-of-Build</h1>
					<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
						<StateIndicator state={state} />
						<span style={{ color: "#666", fontSize: "0.9rem" }}>
							Project: {projectId}
						</span>
					</div>
				</header>

				{manifest ? (
					<Player
						projectId={projectId}
						manifest={manifest}
						state={state}
						script={script || undefined}
						screenshotUrls={screenshotUrls}
						audioUrl={audioUrl}
					/>
				) : (
					<div style={{ padding: "40px", textAlign: "center" }}>
						<p>Manifest not found for this project.</p>
						<p style={{ fontSize: "0.9rem", color: "#666" }}>
							Project ID: {projectId}
						</p>
					</div>
				)}
			</div>,
		);
	} catch (error) {
		console.error("Error rendering page:", error);
		return c.render(
			<div>
				<h1>Error</h1>
				<p>{error instanceof Error ? error.message : "Unknown error"}</p>
			</div>,
		);
	}
});

/**
 * Home page
 */
app.get("/", (c) => {
	return c.render(
		<div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px" }}>
			<h1>Proof-of-Build</h1>
			<p>View your project by visiting: <code>/:projectId</code></p>
			<p style={{ fontSize: "0.9rem", color: "#666" }}>
				Example: <code>/mjyd97na-yvh7v1z</code>
			</p>
		</div>,
	);
});

export default app;
