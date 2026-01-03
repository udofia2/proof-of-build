import { readdir, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";

/**
 * Read all files from a directory recursively
 */
export async function readDirectoryRecursive(
	dirPath: string,
	basePath: string = dirPath,
): Promise<Array<{ filepath: string; filename: string; size: number }>> {
	const files: Array<{ filepath: string; filename: string; size: number }> = [];

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);

			if (entry.isDirectory()) {
				const subFiles = await readDirectoryRecursive(fullPath, basePath);
				files.push(...subFiles);
			} else if (entry.isFile()) {
				const stats = await stat(fullPath);
				const relativePath = relative(basePath, fullPath);
				files.push({
					filepath: relativePath,
					filename: basename(fullPath),
					size: stats.size,
				});
			}
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(`Directory not found: ${dirPath}`);
		}
		throw error;
	}

	return files;
}

/**
 * Check if a path exists and is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
	try {
		const stats = await stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}
