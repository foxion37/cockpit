import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { validateCockpit } from "../src/validate.js";

describe("strict cockpit validation", () => {
	it("accepts a valid kr-batch cockpit without mutating files", async () => {
		const repo = await writeFixture({ cockpit: validCockpit() });
		const cockpitPath = join(repo, "COCKPIT_KR.md");
		const before = await readFile(cockpitPath, "utf8");

		const result = await validateCockpit({
			repoRoot: repo,
			profile: "kr-batch",
		});

		expect(result.ok).toBe(true);
		expect(result.diagnostics).toEqual([]);
		await expect(readFile(cockpitPath, "utf8")).resolves.toBe(before);
	});

	it("reports representative strict gate diagnostics", async () => {
		const repo = await writeFixture({
			cockpit: invalidCockpit([
				"## 2. 배치 구분과 배치별 진행률",
				"```mermaid\nflowchart LR\n  A --> B\n```",
				"| 배치 | 지금의 의미 | 상태 | 진행률 | 자세한 문서 |",
				"| --- | --- | --- | ---: | --- |",
				"| Batch A | 내용 | **진행 중** | **60%** ████████████░░░░░░░░ | `docs/batches/missing.md` |",
				'<span style="color:red">TODO</span>',
			]),
		});

		const result = await validateCockpit({
			repoRoot: repo,
			profile: "kr-batch",
		});

		expect(result.ok).toBe(false);
		expect(codes(result)).toEqual(
			expect.arrayContaining([
				"required_section_missing",
				"forbidden_inline_html",
				"forbidden_placeholder",
				"batch_link_unresolved",
				"mermaid_classdef_missing",
				"progress_alignment_delimiter",
				"progress_bar_not_left_aligned",
			]),
		);
		expect(
			result.diagnostics.find(
				(issue) => issue.code === "required_section_missing",
			),
		).toMatchObject({
			filePath: "COCKPIT_KR.md",
			detail: "## 3. 이번 세션에서 달성한 진행률",
		});
	});

	it("requires visible percentages and left-starting bars in progress rows", async () => {
		const repo = await writeFixture({
			cockpit: validCockpit().replace(
				"| 이번 세션 | ████████░░░░░░░░░░░░ **40%** |",
				"| 이번 세션 | ████████░░░░░░░░░░░░ |",
			),
		});

		const result = await validateCockpit({
			repoRoot: repo,
			profile: "kr-batch",
		});

		expect(codes(result)).toContain("progress_percentage_missing");
	});

	it("rejects overlong cockpit documents", async () => {
		const repo = await writeFixture({
			cockpit: `${validCockpit()}\n${Array.from({ length: 180 }, (_, index) => `extra ${index}`).join("\n")}\n`,
		});

		const result = await validateCockpit({
			repoRoot: repo,
			profile: "kr-batch",
		});

		expect(codes(result)).toContain("cockpit_too_long");
	});

	it("checks batch detail documents for placeholder scraps", async () => {
		const repo = await writeFixture({
			cockpit: validCockpit(),
			batchADoc: "# Batch A\n\n## 목표\n\n진행률 60%\n\n확인\n\n- [ ] TBD\n",
		});

		const result = await validateCockpit({
			repoRoot: repo,
			profile: "kr-batch",
		});

		expect(codes(result)).toEqual(
			expect.arrayContaining([
				"batch_doc_forbidden_placeholder",
				"batch_doc_empty_checkbox",
			]),
		);
	});
});

function codes(result: Awaited<ReturnType<typeof validateCockpit>>): string[] {
	return result.diagnostics.map((issue) => issue.code);
}

async function writeFixture(options: {
	readonly cockpit: string;
	readonly batchADoc?: string;
}): Promise<string> {
	const repo = await mkdtemp(join(tmpdir(), "cockpit-validate-"));
	await writeFile(join(repo, "COCKPIT_KR.md"), options.cockpit, "utf8");
	await mkdir(join(repo, "docs", "batches"), { recursive: true });
	await writeFile(
		join(repo, "docs", "batches", "batch-a.md"),
		options.batchADoc ??
			"# Batch A\n\n## 목표\n\n진행률 60%\n\n확인\n\n- 확인 완료\n",
		"utf8",
	);
	return repo;
}

function validCockpit(): string {
	return [
		"# Project Cockpit",
		"",
		"업데이트: 2026-06-18",
		"상태: **진행 중**",
		"",
		"## 한눈에 보기",
		"",
		"| 구분 | 진행률 |",
		"|---|---|",
		"| 전체 목표 | ███████████████░░░░░ **75%** |",
		"| 현재 배치 묶음 | ████████████░░░░░░░░ **60%** |",
		"| 이번 세션 | ████████░░░░░░░░░░░░ **40%** |",
		"",
		"```mermaid",
		"flowchart LR",
		'  O["전체 목표<br/>75%"] --> B["현재 배치 묶음<br/>60%"] --> S["이번 세션<br/>40%"]',
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  class O,B,S active",
		"```",
		"",
		"## 1. 전체 목표와 목표별 진행률",
		"",
		"| 목표 | 쉬운 설명 | 진행률 |",
		"|---|---|---|",
		"| 자료 연결 | 자료를 연결 | ██████████████████░░ **90%** |",
		"| 검색 준비 | 검색 구조 정리 | ████████████░░░░░░░░ **60%** |",
		"",
		"```mermaid",
		"flowchart LR",
		'  G1["자료 연결<br/>90%"] --- G2["검색 준비<br/>60%"]',
		"  classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d",
		"  class G1 done",
		"```",
		"",
		"## 2. 배치 구분과 배치별 진행률",
		"",
		"| 배치 | 지금의 의미 | 상태 | 진행률 | 자세한 문서 |",
		"|---|---|---|---|---|",
		"| Batch A | 읽기 화면 | **완료** | ████████████████████ **100%** | `docs/batches/batch-a.md` |",
		"",
		"```mermaid",
		"flowchart LR",
		'  A["Batch A<br/>100%"]',
		"  classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d",
		"  class A done",
		"```",
		"",
		"## 3. 이번 세션에서 달성한 진행률",
		"",
		"| 이번 세션 | 진행률 |",
		"|---|---|",
		"| 정리한 것 | ████████████████████ **100%** |",
		"",
		"```mermaid",
		"flowchart LR",
		'  S1["정리한 것<br/>100%"]',
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  class S1 active",
		"```",
		"",
		"## 지금 사용자가 알면 되는 것",
		"",
		"- 자세한 내용은 batch별 문서에 둡니다.",
		"",
		"## 다음 단계",
		"",
		"1. 다음 batch를 확인합니다.",
		"",
	].join("\n");
}

function invalidCockpit(extraLines: readonly string[]): string {
	return validCockpit()
		.split("\n")
		.filter(
			(line) =>
				line !== "## 3. 이번 세션에서 달성한 진행률" &&
				!line.includes("classDef"),
		)
		.join("\n")
		.concat("\n", extraLines.join("\n"), "\n");
}
