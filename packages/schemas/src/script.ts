import { z } from "zod";

/**
 * Script segment - a single narration segment with timing
 */
export const ScriptSegmentSchema = z.object({
	text: z.string().min(1),
	startTime: z.number().nonnegative(), // seconds
	duration: z.number().nonnegative(), // seconds
	frameIndex: z.number().int().nonnegative().optional(), // Associated screenshot index
});

export type ScriptSegment = z.infer<typeof ScriptSegmentSchema>;

/**
 * Generated script structure
 * Written to scripts/{project_id}.json
 */
export const ScriptSchema = z.object({
	projectId: z.string(),
	version: z.literal("1.0").default("1.0"),
	createdAt: z.string().datetime(),
	segments: z.array(ScriptSegmentSchema).min(1),
	totalDuration: z.number().nonnegative(),
	metadata: z
		.object({
			tone: z.string().optional(),
			language: z.string().default("en"),
		})
		.optional(),
});

export type Script = z.infer<typeof ScriptSchema>;
