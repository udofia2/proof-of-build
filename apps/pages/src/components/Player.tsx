import type { Manifest, State, Script } from "@proof-of-build/schemas";

interface PlayerProps {
	projectId: string;
	manifest: Manifest;
	state: State;
	script?: Script;
}

/**
 * Main Playback Player Component
 * Handles dynamic media composition and playback
 */
interface PlayerProps {
	projectId: string;
	manifest: Manifest;
	state: State;
	script?: Script;
	screenshotUrls?: string[]; // Presigned URLs or proxy URLs
	audioUrl?: string | null; // Presigned URL or proxy URL
}

/**
 * Main Playback Player Component
 * Handles dynamic media composition and playback
 * Uses presigned R2 URLs for direct CDN access (if available), otherwise falls back to proxy
 */
export function Player({
	projectId,
	manifest,
	state,
	script,
	screenshotUrls: providedScreenshotUrls,
	audioUrl: providedAudioUrl,
}: PlayerProps) {
	const isReady = state.stage === "ready";
	const hasError = state.stage === "error";

	// Use provided URLs or fall back to generating proxy URLs
	const screenshotUrls =
		providedScreenshotUrls ||
		manifest.artifacts.screenshots.map(
			(screenshot) =>
				`/api/project/${projectId}/asset?key=uploads/${projectId}/frames/${screenshot.filename}`,
		);

	const audioUrl =
		providedAudioUrl !== undefined
			? providedAudioUrl
			: isReady
				? `/api/project/${projectId}/asset?key=audio/${projectId}.m4a`
				: null;

	return (
		<div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
			{hasError && state.error && (
				<div
					style={{
						padding: "16px",
						backgroundColor: "#f8d7da",
						color: "#721c24",
						borderRadius: "4px",
						marginBottom: "20px",
					}}
				>
					<h3 style={{ margin: "0 0 8px 0" }}>Error</h3>
					<p style={{ margin: 0 }}>{state.error.message}</p>
					{state.error.code && (
						<code style={{ fontSize: "0.875rem", opacity: 0.8 }}>
							{state.error.code}
						</code>
					)}
				</div>
			)}

			{!isReady && !hasError && (
				<div
					style={{
						padding: "40px",
						textAlign: "center",
						backgroundColor: "#fff3cd",
						borderRadius: "4px",
						marginBottom: "20px",
					}}
				>
					<p style={{ margin: 0, fontSize: "1.1rem" }}>
						Processing your project... This may take a few minutes.
					</p>
					<p style={{ margin: "8px 0 0 0", fontSize: "0.9rem", opacity: 0.8 }}>
						Stage: {state.stage}
					</p>
				</div>
			)}

			{isReady && (
				<div>
					{/* Screenshot Gallery */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
							gap: "16px",
							marginBottom: "20px",
						}}
					>
						{screenshotUrls.map((url, index) => (
							<div
								key={index}
								style={{
									border: "1px solid #ddd",
									borderRadius: "4px",
									overflow: "hidden",
								}}
							>
								<img
									src={url}
									alt={`Screenshot ${index + 1}`}
									style={{
										width: "100%",
										height: "auto",
										display: "block",
									}}
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
										const parent = (e.target as HTMLImageElement).parentElement;
										if (parent) {
											parent.innerHTML = `<div style="padding: 40px; text-align: center; color: #999;">Image not available</div>`;
										}
									}}
								/>
							</div>
						))}
					</div>

					{/* Audio Player */}
					{audioUrl && (
						<div
							style={{
								marginTop: "20px",
								padding: "20px",
								backgroundColor: "#f8f9fa",
								borderRadius: "4px",
							}}
						>
							<h3 style={{ margin: "0 0 12px 0" }}>Narration</h3>
							<audio
								controls
								src={audioUrl}
								style={{ width: "100%" }}
								onError={(e) => {
									console.error("Audio playback error:", e);
								}}
							>
								Your browser does not support the audio element.
							</audio>
						</div>
					)}

					{/* Script Display */}
					{script && (
						<div
							style={{
								marginTop: "20px",
								padding: "20px",
								backgroundColor: "#f8f9fa",
								borderRadius: "4px",
							}}
						>
							<h3 style={{ margin: "0 0 12px 0" }}>Script</h3>
							<div style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
								{script.segments.map((segment, index) => (
									<div
										key={index}
										style={{
											marginBottom: "12px",
											padding: "8px",
											backgroundColor: "white",
											borderRadius: "4px",
										}}
									>
										<div
											style={{
												fontSize: "0.8rem",
												color: "#666",
												marginBottom: "4px",
											}}
										>
											{segment.startTime.toFixed(1)}s -{" "}
											{(segment.startTime + segment.duration).toFixed(1)}s
										</div>
										<div>{segment.text}</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

