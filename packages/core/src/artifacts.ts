import {
	type Artifact,
	type ArtifactType,
} from "@proof-of-build/schemas";

/**
 * Classify a file based on its path and extension
 * Returns the artifact type or null if unclassifiable
 */
export function classifyArtifact(
	filepath: string,
	filename: string,
): ArtifactType | null {
	const lowerPath = filepath.toLowerCase();
	const _lowerFilename = filename.toLowerCase();

	// Check if it's in a known directory
	if (lowerPath.includes("/frames/") || lowerPath.includes("\\frames\\")) {
		return "screenshot";
	}
	if (lowerPath.includes("/terminal/") || lowerPath.includes("\\terminal\\")) {
		return "terminal";
	}
	if (lowerPath.includes("/logs/") || lowerPath.includes("\\logs\\")) {
		return "log";
	}

	// Classify by file extension
	const ext = filename.split(".").pop()?.toLowerCase();

	// Screenshot extensions
	if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) {
		return "screenshot";
	}

	// Terminal/text extensions
	if (["txt", "out", "term"].includes(ext || "")) {
		return "terminal";
	}

	// Log extensions
	if (["log", "err"].includes(ext || "")) {
		return "log";
	}

	return null;
}

/**
 * Create an artifact object from file information
 */
export function createArtifact(
	filepath: string,
	filename: string,
	size?: number,
	order?: number,
): Artifact | null {
	const type = classifyArtifact(filepath, filename);
	if (!type) {
		return null;
	}

	return {
		type,
		path: filepath,
		filename,
		size,
		order,
		uploadedAt: new Date().toISOString(),
	};
}

/**
 * Extract order number from filename
 * Looks for patterns like "001.png", "frame-001.png", etc.
 */
export function extractOrderFromFilename(filename: string): number | undefined {
	// Match numbers at the start or before extension
	const match = filename.match(/(?:^|\D)(\d{3,})(?:\.|$)/);
	if (match) {
		const num = parseInt(match[1], 10);
		return Number.isNaN(num) ? undefined : num;
	}
	return undefined;
}

/**
 * Sort artifacts by order (if available) or filename
 */
export function sortArtifacts(artifacts: Artifact[]): Artifact[] {
	return [...artifacts].sort((a, b) => {
		// Prefer explicit order
		if (a.order !== undefined && b.order !== undefined) {
			return a.order - b.order;
		}
		if (a.order !== undefined) return -1;
		if (b.order !== undefined) return 1;

		// Fall back to filename
		return a.filename.localeCompare(b.filename);
	});
}
