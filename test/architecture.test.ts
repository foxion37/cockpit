import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { collectGraphSources } from "../src/graph-sources.js";
import { renderCockpitFiles } from "../src/render.js";

describe("cockpit architecture graph sources", () => {
	it("renders all graph sources as unavailable with a fallback Mermaid diagram", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-graph-missing-"));

		const graphSources = await collectGraphSources(repo);
		const files = renderCockpitFiles({
			progress: {
				status: "not_started",
				totalTasks: 0,
				completedTasks: 0,
				remainingTasks: 0,
				percentComplete: 0,
				currentTask: null,
				activePlanName: null,
				warnings: [],
			},
			graphSources,
			stateSources: [],
			legacyFilesDetected: [],
		});

		expect(graphSources.map((source) => source.status)).toEqual([
			"unavailable",
			"unavailable",
			"unavailable",
		]);
		expect(files["ARCHITECTURE.md"]).toContain("```mermaid");
		expect(files["ARCHITECTURE.md"]).toContain("codegraph");
		expect(files["ARCHITECTURE.md"]).toContain("codebase-memory-mcp");
		expect(files["ARCHITECTURE.md"]).toContain("understand-anything");
	});

	it("detects an Understand-Anything knowledge graph artifact", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-understand-"));
		await mkdir(join(repo, ".understand-anything"), { recursive: true });
		await writeFile(
			join(repo, ".understand-anything", "knowledge-graph.json"),
			"{}",
			"utf8",
		);

		const graphSources = await collectGraphSources(repo);

		expect(
			graphSources.find((source) => source.name === "understand-anything"),
		).toMatchObject({
			status: "available",
			artifactPath: ".understand-anything/knowledge-graph.json",
		});
	});
});
