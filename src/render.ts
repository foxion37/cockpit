import {
	COCKPIT_FILE_NAMES,
	type CockpitModel,
	type CockpitRenderedFiles,
	type CockpitRenderOptions,
	type KrBatchRenderedFiles,
} from "./types.js";

export function renderCockpitFiles(model: CockpitModel): CockpitRenderedFiles;
export function renderCockpitFiles(
	model: CockpitModel,
	options: CockpitRenderOptions & { profile: "default" },
): CockpitRenderedFiles;
export function renderCockpitFiles(
	model: CockpitModel,
	options: CockpitRenderOptions & { profile: "kr-batch" },
): KrBatchRenderedFiles;
export function renderCockpitFiles(
	model: CockpitModel,
	options: CockpitRenderOptions = {},
): CockpitRenderedFiles | KrBatchRenderedFiles {
	if (options.profile === "kr-batch") {
		return renderKrBatchFiles(model);
	}

	return {
		"WORKPLAN.md": renderWorkplan(model),
		"ARCHITECTURE.md": renderArchitecture(model),
		"STATUS_KR.md": renderStatusKr(model),
		"AGENT_GUARDRAILS.md": renderGuardrails(model),
	};
}

function renderKrBatchFiles(model: CockpitModel): KrBatchRenderedFiles {
	return {
		"COCKPIT_KR.md": renderKrBatchCockpit(model),
		"docs/batches/README.md": renderKrBatchIndex(),
		"docs/batches/current-batch.md": renderCurrentBatchDoc(model),
	};
}

function renderWorkplan(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "none";
	const activePlanName = progress.activePlanName ?? "not started";
	return [
		"# Workplan",
		"",
		`Overall Progress: ${safePercent}%`,
		`Plan: ${activePlanName}`,
		`Tasks: ${progress.completedTasks}/${progress.totalTasks} complete`,
		`Remaining: ${progress.remainingTasks}`,
		`Current Batch: ${currentTask}`,
		"",
		"## Pulse Board",
		"visible progress bar",
		"",
		"```text",
		...renderWorkplanPulseRows(model, safePercent),
		"```",
		"",
		"## Radar Panel",
		"| Signal | Reading |",
		"| --- | --- |",
		`| Status | ${progress.status} |`,
		`| Completion | ${safePercent}% |`,
		`| Completed Tasks | ${progress.completedTasks} |`,
		`| Remaining Tasks | ${progress.remainingTasks} |`,
		`| Current Batch | ${currentTask} |`,
		"",
		"## Phases",
		"```text",
		...renderPhaseLines(safePercent),
		"```",
		"",
		"## Detailed Batches",
		`- Active batch: ${currentTask}`,
		`- Batch progress: ${renderProgressBar(safePercent, 12)} ${safePercent}%`,
		"",
		"## Durable State Sources",
		"| Source | Status | Path | Summary |",
		"| --- | --- | --- | --- |",
		...model.stateSources.map(
			(source) =>
				`| ${source.name} | ${source.status} | ${source.path} | ${source.summary} |`,
		),
		"",
		"## Warnings",
		...listOrNone(progress.warnings),
		"",
	].join("\n");
}

function renderArchitecture(model: CockpitModel): string {
	return [
		"# Architecture",
		"",
		"```mermaid",
		"flowchart LR",
		"  State[Durable Cockpit state] --> Cockpit[.cockpit renderer]",
		"  CodeGraph[codegraph] --> Cockpit",
		"  CodebaseMemory[codebase-memory-mcp] --> Cockpit",
		"  UnderstandAnything[understand-anything] --> Cockpit",
		"  Cockpit --> Files[Four cockpit files]",
		"```",
		"",
		"## Metro Map",
		"| Stop | Link | Condition |",
		"| --- | --- | --- |",
		...model.graphSources.map(
			(source) =>
				`| ${source.name} | ${source.artifactPath ?? "no artifact"} | ${source.status} |`,
		),
		"",
		"## Graph Sources",
		"| Source | Status | Artifact | Note |",
		"| --- | --- | --- | --- |",
		...model.graphSources.map(
			(source) =>
				`| ${source.name} | ${source.status} | ${source.artifactPath ?? "none"} | ${source.note} |`,
		),
		"",
	].join("\n");
}

function renderStatusKr(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "없음";
	const riskText =
		progress.warnings.length === 0
			? "큰 경고 없음"
			: progress.warnings.join(" / ");
	return [
		"# 진행상황",
		"",
		"## 상태판",
		"",
		"```text",
		...renderKoreanStatusBoard(model, safePercent),
		"```",
		"",
		`미니 펄스 ${renderProgressBar(safePercent)} ${safePercent}%`,
		`미니 진행: ${progress.completedTasks}/${progress.totalTasks} 작업 완료, 남은 작업 ${progress.remainingTasks}개.`,
		`결론: 현재 진행률은 ${safePercent}%입니다.`,
		`근거: 다음 작업은 ${currentTask}입니다.`,
		`리스크: ${riskText}.`,
		`다음: ${progress.currentTask ?? "새 작업을 시작하세요."}`,
		"",
	].join("\n");
}

function renderGuardrails(model: CockpitModel): string {
	return [
		"# Agent Guardrails",
		"",
		"## Primary Cockpit files",
		...COCKPIT_FILE_NAMES.map((fileName) => `- .cockpit/${fileName}`),
		"",
		"## Rules",
		"- Treat existing .cockpit/ulw-loop, .cockpit/start-work, and .cockpit/plans state as machine truth.",
		"- Do not create extra planning/status docs without explicit user approval.",
		"- Do not delete or rewrite legacy Cockpit files automatically.",
		"- Keep Korean user status in STATUS_KR.md, not in this guardrail file.",
		"",
		"## Legacy files detected",
		...listOrNone(model.legacyFilesDetected),
		"",
	].join("\n");
}

function renderKrBatchCockpit(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "정해진 작업 없음";
	const activePlanName = progress.activePlanName ?? "계획 없음";
	const status = renderKoreanStatus(progress.status);

	return [
		"# Cockpit",
		"",
		`상태: **${status}**`,
		"문서 성격: 비개발자용 현재 상황판",
		"",
		"> 이 문서는 지금 어디까지 왔는지만 짧게 보여줍니다.",
		"> 자세한 작업 기록과 기술 판단은 `docs/batches/` 아래 문서에 둡니다.",
		"",
		"## 한눈에 보기",
		"",
		`현재 계획은 **${activePlanName}**이고, 지금 보는 작업은 **${currentTask}**입니다.`,
		"",
		"| 구분 | 진행률 |",
		"|---|---|",
		`| 전체 목표 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 현재 배치 묶음 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 이번 세션 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		"",
		"```mermaid",
		"flowchart LR",
		`  O["전체 목표<br/>${safePercent}%"] --> B["현재 배치 묶음<br/>${safePercent}%"] --> S["이번 세션<br/>${safePercent}%"]`,
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  classDef caution fill:#fef3c7,stroke:#f59e0b,color:#78350f",
		"  class O,B active",
		"  class S caution",
		"```",
		"",
		"## 1. 전체 목표와 목표별 진행률",
		"",
		"| 목표 | 쉬운 설명 | 진행률 |",
		"|---|---|---|",
		`| 현재 계획 | 진행 중인 계획을 끝까지 검증 가능한 상태로 정리 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		"",
		"## 2. 배치 구분과 배치별 진행률",
		"",
		"| 배치 | 지금의 의미 | 상태 | 진행률 | 자세한 문서 |",
		"|---|---|---|---|---|",
		`| Current Batch | ${currentTask} | **${status}** | ${renderProgressBar(safePercent)} **${safePercent}%** | \`docs/batches/current-batch.md\` |`,
		"",
		"## 3. 이번 세션에서 달성한 진행률",
		"",
		"| 이번 세션 | 진행률 |",
		"|---|---|",
		`| 완료한 일 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 남은 일 | ${progress.remainingTasks}개 |`,
		"",
		"## 자세한 문서",
		"",
		"- `docs/batches/README.md`",
		"- `docs/batches/current-batch.md`",
		"",
	].join("\n");
}

function renderKrBatchIndex(): string {
	return [
		"# Batch Documents",
		"",
		"This folder keeps details that are too long for the short cockpit status.",
		"",
		"## Documents",
		"",
		"- `docs/batches/current-batch.md`",
		"",
		"## Writing Contract",
		"",
		"- Keep the cockpit short.",
		"- Put commands, logs, and technical decisions in batch documents.",
		"- Link batch documents from `COCKPIT_KR.md`.",
		"",
	].join("\n");
}

function renderCurrentBatchDoc(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "Current batch";
	const warnings =
		progress.warnings.length === 0 ? ["- none"] : listOrNone(progress.warnings);

	return [
		"# Current Batch",
		"",
		`Status: **${progress.status}**`,
		`Progress: ${renderProgressBar(safePercent)} **${safePercent}%**`,
		"",
		"## Goal",
		"",
		`Complete and verify ${currentTask}.`,
		"",
		"## Checks",
		"",
		`- Completed tasks: ${progress.completedTasks}/${progress.totalTasks}`,
		`- Remaining tasks: ${progress.remainingTasks}`,
		"",
		"## Notes",
		"",
		...warnings,
		"",
	].join("\n");
}

function listOrNone(values: readonly string[]): string[] {
	return values.length === 0 ? ["- none"] : values.map((value) => `- ${value}`);
}

function normalizePercent(percent: number): number {
	if (!Number.isFinite(percent)) {
		return 0;
	}

	return Math.min(100, Math.max(0, Math.round(percent)));
}

function renderKoreanStatus(status: string): string {
	switch (status) {
		case "not_started":
			return "대기";
		case "in_progress":
			return "진행 중";
		case "complete":
			return "완료";
		case "blocked":
			return "막힘";
		case "warning":
			return "주의";
		default:
			return status;
	}
}

function renderProgressBar(percent: number, barWidth = 20): string {
	const safePercent = normalizePercent(percent);
	const filledCells = Math.round((safePercent / 100) * barWidth);
	const emptyCells = barWidth - filledCells;
	const filled = process.env["COCKPIT_ASCII"] === "1" ? "#" : "█";
	const empty = process.env["COCKPIT_ASCII"] === "1" ? "-" : "░";

	return `[${filled.repeat(filledCells)}${empty.repeat(emptyCells)}]`;
}

function renderDotCells(completed: number, total: number): string {
	if (total <= 0) {
		return "[]";
	}

	const safeCompleted = Math.min(total, Math.max(0, completed));
	return `[${"●".repeat(safeCompleted)}${"○".repeat(total - safeCompleted)}]`;
}

function renderWorkplanPulseRows(
	model: CockpitModel,
	safePercent: number,
): string[] {
	const { progress } = model;
	const currentTask = progress.currentTask ?? "none";
	const activePlanName = progress.activePlanName ?? "not started";
	return [
		fixedColumns(
			[
				"overall",
				`${safePercent}%`,
				renderProgressBar(safePercent),
				progress.status,
			],
			10,
		),
		fixedColumns(
			[
				"plan",
				`${safePercent}%`,
				renderProgressBar(safePercent),
				activePlanName,
			],
			10,
		),
		fixedColumns(
			[
				"tasks",
				`${progress.completedTasks}/${progress.totalTasks}`,
				renderDotCells(progress.completedTasks, progress.totalTasks),
				`remaining ${progress.remainingTasks}`,
			],
			10,
		),
		fixedColumns(
			[
				"batch",
				`${safePercent}%`,
				renderProgressBar(safePercent, 12),
				currentTask,
			],
			10,
		),
	];
}

function renderKoreanStatusBoard(
	model: CockpitModel,
	safePercent: number,
): string[] {
	const { progress } = model;
	const currentTask = progress.currentTask ?? "없음";
	const riskText =
		progress.warnings.length === 0
			? "큰 경고 없음"
			: progress.warnings.join(" / ");

	return [
		pipeColumns([
			"진행률",
			`${safePercent}%`,
			renderProgressBar(safePercent),
			`${progress.completedTasks}/${progress.totalTasks} 완료`,
		]),
		pipeColumns([
			"현재 작업",
			currentTask,
			renderDotCells(progress.completedTasks, progress.totalTasks),
			progress.currentTask ? "다음 확인" : "새 작업 필요",
		]),
		fixedColumns(
			[
				"진행",
				`${safePercent}%`,
				renderProgressBar(safePercent),
				`${progress.completedTasks}/${progress.totalTasks} 완료`,
			],
			7,
		),
		fixedColumns(
			[
				"남은일",
				`${progress.remainingTasks}개`,
				renderDotCells(progress.completedTasks, progress.totalTasks),
				`다음: ${currentTask}`,
			],
			7,
		),
		fixedColumns(
			["리스크", progress.warnings.length === 0 ? "정상" : "주의", riskText],
			7,
		),
	];
}

function renderPhaseLines(percent: number): string[] {
	const phases = [
		{ label: "Phase 1: Foundation", start: 0, end: 25 },
		{ label: "Phase 2: Collectors and renderers", start: 25, end: 50 },
		{ label: "Phase 3: Hooks and skill sync", start: 50, end: 75 },
		{ label: "Phase 4: Verification", start: 75, end: 100 },
	];
	const phaseSnapshots = phases.map((phase) => {
		const span = phase.end - phase.start;
		const localPercent = normalizePercent(
			((percent - phase.start) / span) * 100,
		);
		const status =
			localPercent >= 100
				? "complete"
				: localPercent > 0
					? "active"
					: "pending";
		return {
			compactLabel: phase.label.replace(": Collectors and renderers", ""),
			label: phase.label,
			localPercent,
			status,
		};
	});
	const detailRows = phaseSnapshots.map((phase) =>
		pipeColumns([
			phase.label,
			`${phase.localPercent}%`,
			renderProgressBar(phase.localPercent, 8),
			phase.status,
		]),
	);
	const compactRows = phaseSnapshots.map((phase) =>
		fixedColumns(
			[
				phase.compactLabel,
				`${phase.localPercent}%`,
				renderProgressBar(phase.localPercent, 8),
			],
			9,
		),
	);

	return [...detailRows, "", ...compactRows];
}

function pipeColumns(values: readonly string[]): string {
	const widths = [33, 7, 22];
	return values
		.map((value, index) => {
			const width = widths[index];
			return width === undefined ? value : padDisplay(value, width);
		})
		.join(" | ");
}

function fixedColumns(
	values: readonly string[],
	firstColumnWidth: number,
): string {
	return values
		.map((value, index) =>
			index === 0 ? padCharacters(value, firstColumnWidth) : value,
		)
		.join("  ")
		.trimEnd();
}

function padCharacters(value: string, width: number): string {
	const padding = Math.max(0, width - value.length);
	return `${value}${" ".repeat(padding)}`;
}

function padDisplay(value: string, width: number): string {
	const padding = Math.max(0, width - displayWidth(value));
	return `${value}${" ".repeat(padding)}`;
}

function displayWidth(value: string): number {
	let width = 0;
	for (const character of value) {
		width += characterDisplayWidth(character);
	}
	return width;
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
