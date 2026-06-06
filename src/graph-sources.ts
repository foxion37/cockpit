import { access } from "node:fs/promises";
import { join } from "node:path";

import type { CockpitGraphSource } from "./types.js";

export async function collectGraphSources(
	repoRoot: string,
): Promise<CockpitGraphSource[]> {
	const codegraph = await exists(join(repoRoot, ".codegraph"));
	const codebaseMemory = await exists(join(repoRoot, ".codebase-memory"));
	const understandAnything = await exists(
		join(repoRoot, ".understand-anything", "knowledge-graph.json"),
	);
	return [
		{
			name: "codegraph",
			status: codegraph ? "available" : "unavailable",
			artifactPath: codegraph ? ".codegraph" : null,
			note: codegraph
				? "CodeGraph index detected."
				: "Unavailable: run codegraph init -i.",
		},
		{
			name: "codebase-memory-mcp",
			status: codebaseMemory ? "available" : "unavailable",
			artifactPath: codebaseMemory ? ".codebase-memory" : null,
			note: codebaseMemory
				? "codebase-memory-mcp artifact detected."
				: "Unavailable: no local codebase-memory artifact detected.",
		},
		{
			name: "understand-anything",
			status: understandAnything ? "available" : "unavailable",
			artifactPath: understandAnything
				? ".understand-anything/knowledge-graph.json"
				: null,
			note: understandAnything
				? "Understand-Anything knowledge graph detected."
				: "Unavailable: no .understand-anything/knowledge-graph.json.",
		},
	];
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return false;
		throw error;
	}
}
