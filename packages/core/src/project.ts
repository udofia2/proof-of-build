import { type ProjectId, ProjectIdSchema } from "@proof-of-build/schemas";

/**
 * Generate a new project ID
 * Uses timestamp + random string for uniqueness
 */
export function generateProjectId(): ProjectId {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 9);
	return `${timestamp}-${random}`;
}

/**
 * Validate a project ID
 * Returns the validated project ID or throws
 */
export function validateProjectId(id: string): ProjectId {
	return ProjectIdSchema.parse(id);
}

/**
 * Check if a string is a valid project ID
 * Returns true if valid, false otherwise
 */
export function isValidProjectId(id: string): boolean {
	return ProjectIdSchema.safeParse(id).success;
}
