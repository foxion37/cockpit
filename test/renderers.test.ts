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
			path: ".cockpit/start-work/ledger.jsonl",
			status: "available",
			summary: "2 event(s)",
		},
		{
			name: "ulw-loop goals",
			path: ".cockpit/ulw-loop/goals.json",
			status: "available",
			summary: "1 goal(s), 1/2 criterion pass",
		},
		{
			name: "ulw-loop ledger",
			path: ".cockpit/ulw-loop/ledger.jsonl",
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

		const previous = process.env["COCKPIT_ASCII"];
		process.env["COCKPIT_ASCII"] = "1";
		try {
			const asciiFiles = renderCockpitFiles(model);
			expect(asciiFiles["WORKPLAN.md"]).toContain("#");
			expect(asciiFiles["WORKPLAN.md"]).toContain("-");
			expect(asciiFiles["WORKPLAN.md"]).not.toContain("█");
		} finally {
			if (previous === undefined) delete process.env["COCKPIT_ASCII"];
			else process.env["COCKPIT_ASCII"] = previous;
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

	it("renders STATUS_KR as a generous but aligned dot status board", () => {
		const files = renderCockpitFiles(model);
		const status = files["STATUS_KR.md"];

		expect(status).toContain("## 상태판");
		expect(status).toContain("```text\n");
		expect(status).toContain(
			"진행       50%  [██████████░░░░░░░░░░]  1/2 완료",
		);
		expect(status).toContain("남은일      1개  [●○]  다음: Batch 2");
		expect(status).toContain("리스크      정상  큰 경고 없음");
		expect(status).not.toContain("미니 펄스:");
	});

	it("renders STATUS_KR with a fixed-width Korean status board", () => {
		const files = renderCockpitFiles(model);
		const statusKr = files["STATUS_KR.md"];

		expect(statusKr).toContain("상태판");

		const board = extractFencedBlockNear(statusKr, "상태판");
		expect(board).toContain("진행률");
		expect(board).toContain("현재 작업");
		expectAlignedPipeRows(board);
	});

	it("renders WORKPLAN phase progress as fixed-width aligned rows", () => {
		const files = renderCockpitFiles(model);
		const phaseSection = extractSection(files["WORKPLAN.md"], "## Phases");

		expect(phaseSection).not.toMatch(/^- /m);

		const phaseBoard = extractFirstFencedBlock(phaseSection, "WORKPLAN phases");
		expect(phaseBoard).toContain("Phase 1: Foundation");
		expect(phaseBoard).toContain("Phase 4: Verification");
		expectAlignedPipeRows(phaseBoard);
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

	it("keeps WORKPLAN progress rows aligned for scanning", () => {
		const files = renderCockpitFiles(model);
		const workplan = files["WORKPLAN.md"];

		expect(workplan).toContain("```text\n");
		expect(workplan).toContain(
			"overall     50%  [██████████░░░░░░░░░░]  in_progress",
		);
		expect(workplan).toContain("batch       50%  [██████░░░░░░]  Batch 2");
		expect(workplan).toContain("Phase 2    100%  [████████]");
	});

	it("keeps AGENT_GUARDRAILS plain and free of graphics language", () => {
		const files = renderCockpitFiles(model);

		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("Pulse Board");
		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("Radar Panel");
		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("Metro Map");
		expect(files["AGENT_GUARDRAILS.md"]).not.toContain("결론");
	});
});

function extractSection(markdown: string, heading: string): string {
	const headingIndex = markdown.indexOf(heading);
	expect(
		headingIndex,
		`${heading} section should exist`,
	).toBeGreaterThanOrEqual(0);

	const sectionStart = headingIndex + heading.length;
	const remainingMarkdown = markdown.slice(sectionStart);
	const nextHeadingIndex = remainingMarkdown.search(/\n## /);
	const section =
		nextHeadingIndex === -1
			? remainingMarkdown
			: remainingMarkdown.slice(0, nextHeadingIndex);

	return section.trim();
}

function extractFencedBlockNear(markdown: string, label: string): string {
	const labelIndex = markdown.indexOf(label);
	expect(labelIndex, `${label} label should exist`).toBeGreaterThanOrEqual(0);

	return extractFirstFencedBlock(markdown.slice(labelIndex), label);
}

function extractFirstFencedBlock(
	markdown: string,
	description: string,
): string {
	const match = markdown.match(/```(?:text|txt)?\n([\s\S]*?)\n```/);
	expect(
		match,
		`${description} should include a fenced code block`,
	).not.toBeNull();

	return match?.[1] ?? "";
}

function expectAlignedPipeRows(block: string): void {
	const rows = block.split("\n").filter((line) => line.includes("|"));
	expect(
		rows.length,
		"expected at least two pipe-delimited rows",
	).toBeGreaterThan(1);

	const firstRow = rows[0] ?? "";
	const remainingRows = rows.slice(1);
	const expectedColumns = pipeDisplayColumns(firstRow);
	expect(expectedColumns.length).toBeGreaterThan(0);

	for (const row of remainingRows) {
		expect(pipeDisplayColumns(row)).toEqual(expectedColumns);
	}
}

function pipeDisplayColumns(line: string): number[] {
	const columns: number[] = [];
	let width = 0;

	for (const character of line) {
		if (character === "|") {
			columns.push(width);
		}
		width += characterDisplayWidth(character);
	}

	return columns;
}

function characterDisplayWidth(character: string): number {
	const codePoint = character.codePointAt(0) ?? 0;
	const isWide =
		(codePoint >= 0x1100 && codePoint <= 0x115f) ||
		(codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
		(codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
		(codePoint >= 0xf900 && codePoint <= 0xfaff) ||
		(codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
		(codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
		(codePoint >= 0xff00 && codePoint <= 0xff60) ||
		(codePoint >= 0xffe0 && codePoint <= 0xffe6);

	return isWide ? 2 : 1;
}
