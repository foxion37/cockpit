import { describe, expect, it } from "vitest";

import { renderCockpitFiles } from "../src/render.js";
import type { CockpitModel } from "../src/types.js";

const model: CockpitModel = {
	progress: {
		status: "in_progress",
		totalTasks: 5,
		completedTasks: 2,
		remainingTasks: 3,
		percentComplete: 40,
		currentTask: "profile contract",
		activePlanName: "cockpit-vnext-style-gate",
		warnings: ["validation wiring is tracked separately"],
	},
	graphSources: [],
	stateSources: [
		{
			name: "plan",
			path: ".omo/plans/cockpit-vnext-style-gate.md",
			status: "available",
			summary: "profile rendering contract",
		},
	],
	legacyFilesDetected: [],
};

describe("kr-batch renderer profile", () => {
	it("returns the Korean cockpit status and batch document contract", () => {
		const files = renderCockpitFiles(model, { profile: "kr-batch" });

		expect(Object.keys(files).sort()).toEqual([
			"COCKPIT_KR.md",
			"docs/batches/README.md",
			"docs/batches/current-batch.md",
		]);

		const cockpit = files["COCKPIT_KR.md"];
		expect(cockpit).toContain("# Cockpit");
		expect(cockpit).toContain("## 한눈에 보기");
		expect(cockpit).toContain("## 1. 전체 목표와 목표별 진행률");
		expect(cockpit).toContain("## 2. 배치 구분과 배치별 진행률");
		expect(cockpit).toContain("## 3. 이번 세션에서 달성한 진행률");
		expect(cockpit).toContain("docs/batches/README.md");
		expect(cockpit).toContain("docs/batches/current-batch.md");
		expect(cockpit).toContain("classDef active");
		expect(cockpit).toContain("**40%**");
		expect(cockpit.split("\n").length).toBeLessThanOrEqual(120);
		expect(cockpit.match(/```mermaid/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
		expect(cockpit.match(/\bclassDef\b/g)?.length ?? 0).toBeGreaterThanOrEqual(
			3,
		);
		expect(cockpit).not.toMatch(/<span|style=|---:/);
		expect(cockpit).toContain("## 지금 사용자가 알면 되는 것");
		expect(cockpit).toContain("## 다음 단계");
		expect(cockpit).toMatch(/\| 전체 목표 \| █{8}░{12} \*\*40%\*\* \|/);
		expect(cockpit).toMatch(
			/\| 현재 배치 \| profile contract \| \*\*진행 중\*\* \| █{8}░{12} \*\*40%\*\* \| `docs\/batches\/current-batch\.md` \|/,
		);

		const batchIndex = files["docs/batches/README.md"];
		expect(batchIndex).toContain("# Batch별 상세 문서");
		expect(batchIndex).toContain("docs/batches/current-batch.md");

		const currentBatch = files["docs/batches/current-batch.md"];
		expect(currentBatch).toContain("# 현재 배치 상세 문서");
		expect(currentBatch).toContain("profile contract");
		expect(currentBatch).toContain("## 목표");
		expect(currentBatch).toContain("## 확인한 것");
	});

	it("keeps generic kr-batch templates free of local project text", () => {
		const files = renderCockpitFiles(model, { profile: "kr-batch" });
		const renderedText = Object.values(files).join("\n");
		const forbiddenLocalText = new RegExp(
			[
				"Sing" + "andMong",
				"/Users/" + "seongqkim",
				"hook-failed-to-parse-" + "plugin-hooks",
			].join("|"),
		);

		expect(renderedText).not.toMatch(forbiddenLocalText);
	});
});
