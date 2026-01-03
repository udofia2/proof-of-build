/**
 * Configuration utilities for CLI
 * Reads from environment variables with sensible defaults
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Get R2 bucket name from environment variable or default
 */
export function getR2BucketName(): string {
	return process.env.R2_BUCKET_NAME || "proof-of-build-uploads";
}

/**
 * Get Cloudflare Account ID from environment variable
 * Used for R2 operations if needed
 */
export function getCloudflareAccountId(): string | undefined {
	return process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
}

/**
 * Check if Wrangler is authenticated via OAuth (wrangler login)
 * Wrangler stores OAuth credentials in ~/.wrangler/config/
 */
function hasWranglerOAuth(): boolean {
	const wranglerConfigDir = join(homedir(), ".wrangler", "config");
	return existsSync(wranglerConfigDir);
}

/**
 * Check if authentication is provided via environment variables
 */
function hasEnvAuth(): boolean {
	return !!(
		process.env.CLOUDFLARE_API_TOKEN ||
		process.env.CF_API_TOKEN ||
		process.env.CF_API_KEY
	);
}

/**
 * Validate that required environment is set up
 * Checks if Wrangler is authenticated (via wrangler login or env vars)
 * Only warns if neither method is detected
 */
export function validateWranglerAuth(): void {
	const hasOAuth = hasWranglerOAuth();
	const hasEnv = hasEnvAuth();

	if (!hasOAuth && !hasEnv) {
		console.warn("\n⚠️  Warning: No Cloudflare authentication detected.");
		console.warn(
			"   Run 'wrangler login' or set CLOUDFLARE_API_TOKEN environment variable.",
		);
		console.warn("   Wrangler commands may fail if not authenticated.\n");
	}
}
