import { AwsClient } from "aws4fetch";
import type { ProjectId } from "@proof-of-build/schemas";

/**
 * R2 Utilities for Pages App
 * Handles signed URL generation for assets
 */

interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
}

/**
 * Generate a presigned URL for an R2 object
 * 
 * Note: This requires R2 API credentials (Access Key ID and Secret Access Key)
 * These should be set as environment variables or secrets
 */
export async function generatePresignedUrl(
	config: R2Config,
	key: string,
	expiresIn: number = 3600,
): Promise<string> {
	const client = new AwsClient({
		service: "s3",
		region: "auto",
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
	});

	const r2Url = `https://${config.accountId}.r2.cloudflarestorage.com`;
	const url = `${r2Url}/${config.bucketName}/${key}?X-Amz-Expires=${expiresIn}`;

	const signedRequest = await client.sign(new Request(url), {
		aws: { signQuery: true },
	});

	return signedRequest.url;
}

/**
 * Build R2 key for a screenshot
 */
export function buildScreenshotKey(projectId: ProjectId, filename: string): string {
	return `uploads/${projectId}/frames/${filename}`;
}

/**
 * Build R2 key for audio
 */
export function buildAudioKey(projectId: ProjectId): string {
	return `audio/${projectId}.m4a`;
}

/**
 * Build R2 key for script
 */
export function buildScriptKey(projectId: ProjectId): string {
	return `scripts/${projectId}.json`;
}

/**
 * Get R2 config from environment
 * Falls back to public URLs if credentials not available
 */
export function getR2Config(env: CloudflareBindings): R2Config | null {
	// Check if R2 API credentials are available
	// These would need to be set as secrets or environment variables
	const accountId = env.CLOUDFLARE_ACCOUNT_ID;
	const accessKeyId = env.R2_ACCESS_KEY_ID;
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY;

	if (!accountId || !accessKeyId || !secretAccessKey) {
		return null; // Credentials not available
	}

	return {
		accountId,
		accessKeyId,
		secretAccessKey,
		bucketName: "proof-of-build-uploads",
	};
}

/**
 * Generate public URL for R2 object (if bucket is public)
 * Falls back to this if presigned URLs aren't available
 */
export function buildPublicUrl(projectId: ProjectId, key: string): string {
	// This would be the public URL if the bucket is configured for public access
	// For now, return a placeholder
	return `/api/project/${projectId}/asset?key=${encodeURIComponent(key)}`;
}

