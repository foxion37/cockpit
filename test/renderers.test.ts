import { describe, expect, it } from "vitest";

import { renderCockpitFiles } from "../src/render.js";
import type { CockpitModel } from "../src/types.js";

const model: CockpitModel = {
	progress: {
		status: "in_progress",
		totalTasks: 2,
		completedTasks: 1,
		remainingTasks: 1,
		percentComplete: 50,
		currentTask: "Batch 2",
		activePlanName: "demo",
		warnings: [],
	},
	graphSources: [
		{
			name: "codegraph",
			status: "unavailable",
			artifactPath: null,
			note: "run codegraph init -i",
		},
		{
			name: "codebase-memory-mcp",
			status: "unavailable",
			artifactPath: null,
			note: "no local artifact detected",
		},
		{
			name: "understand-anything",
			status: "unavailable",
			artifactPath: null,
			note: "no knowledge graph detected",
		},
	],
	stateSources: [
		{
			name: "start-work ledger",
			path: ".omo/start-work/ledger.jsonl",
			status: "available",
			summary: "2 event(s)",
		},
		{
			name: "ulw-loop goals",
			path: ".omo/ulw-loop/goals.json",
			status: "available",
			summary: "1 goal(s), 1/2 criterion pass",
		},
		{
			name: "ulw-loop ledger",
			path: ".omo/ulw-loop/ledger.jsonl",
			status: "available",
			summary: "1 event(s)",
		},
	],
	legacyFilesDetected: ["DOCS_CONTRACT.md"],
};

const zeroModel: CockpitModel = {
	progress: {
		status: "in_progress",
		totalTasks: 0,
		completedTasks: 0,
		remainingTasks: 0,
		percentComplete: 0,
		currentTask: null,
		activePlanName: "zero-state",
		warnings: ["needs attention"],
	},
	graphSources: [],
	stateSources: [],
	legacyFilesDetected: [],
};

describe("cockpit markdown renderers", () => {
	it("renders WORKPLAN with pulse-board and radar-panel graphics", () => {
		const files = renderCockpitFiles(model);

		expect(files["WORKPLAN.md"]).toContain("## Pulse Board");
		expect(files["WORKPLAN.md"]).toContain("## Radar Panel");
		expect(files["WORKPLAN.md"]).toContain("50%");
		expect(files["WORKPLAN.md"]).toContain("Batch 2");
		expect(files["WORKPLAN.md"]).toContain("visible progress bar");
	});

	it("uses unicode graphics by default and supports ascii fallback", () => {
		const files = renderCockpitFiles(model);
		expect(files["WORKPLAN.md"]).toContain("█");
		expect(files["WORKPLAN.md"]).toContain("░");

		const previous = process.env["OMO_COCKPIT_ASCII"];
		process.env["OMO_COCKPIT_ASCII"] = "1";
		try {
			const asciiFiles = renderCockpitFiles(model);
			expect(asciiFiles["WORKPLAN.md"]).toContain("#");
			expect(asciiFiles["WORKPLAN.md"]).toContain("-");
			expect(asciiFiles["WORKPLAN.md"]).not.toContain("█");
		} finally {
			if (previous === undefined) delete process.env["OMO_COCKPIT_ASCII"];
			else process.env["OMO_COCKPIT_ASCII"] = previous;
		}
	});

	it("renders ARCHITECTURE with metro-map references", () => {
		const files = renderCockpitFiles(model);

		expect(files["ARCHITECTURE.md"]).toContain("## Metro Map");
		expect(files["ARCHITECTURE.md"]).toContain("codegraph");
		expect(files["ARCHITECTURE.md"]).toContain("codebase-memory-mcp");
		expect(files["ARCHITECTURE.md"]).toContain("understand-anything");
	});

	it("renders STATUS_KR with mini pulse progress language", () => {
		const files = renderCockpitFiles(model);

		expect(files["STATUS_KR.md"]).toContain("미니 펄스");
		expect(files["STATUS_KR.md"]).toContain("미니 진행");
		expect(files["STATUS_KR.md"]).toContain("50%");
	});

	it("handles the zero-task boundary without NaN or Infinity", () => {
		const files = renderCockpitFiles(model);

		const zeroFiles = renderCockpitFiles(zeroModel);

		expect(zeroFiles["WORKPLAN.md"]).toContain("0%");
		expect(zeroFiles["STATUS_KR.md"]).toContain("0%");
		expect(zeroFiles["WORKPLAN.md"]).not.toContain("NaN");
		expect(zeroFiles["WORKPLAN.md"]).not.toContain("Infinity");
		expect(zeroFiles["STATUS_KR.md"]).not.toContain("NaN");
		expect(zeroFiles["STATUS_KR.md"]).not.toContain("Infinity");
		expect(files["WORKPLAN.md"]).not.toContain("NaN");
		expect(files["STATUS_KR.md"]).not.toContain("NaN");
	});

	it("keeps AGENT_GUARDRAILS plain and free of graphics language", () => {
		const files = renderCockpitFiles(model);

		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("Pulse Board");
		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("Radar Panel");
		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("Metro Map");
		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("결론");
	});
});
