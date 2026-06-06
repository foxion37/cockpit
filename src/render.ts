import {
	COCKPIT_FILE_NAMES,
	type CockpitModel,
	type CockpitRenderedFiles,
} from "./types.js";

export function renderCockpitFiles(model: CockpitModel): CockpitRenderedFiles {
	return {
		"WORKPLAN.md": renderWorkplan(model),
		"ARCHITECTURE.md": renderArchitecture(model),
		"STATUS_KR.md": renderStatusKr(model),
		"AGENT_GUARDRAILS.md": renderGuardrails(model),
	};
}

function renderWorkplan(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	return [
		"# Workplan",
		"",
		`Overall Progress: ${safePercent}%`,
		`Plan: ${progress.activePlanName ?? "not started"}`,
		`Tasks: ${progress.completedTasks}/${progress.totalTasks} complete`,
		`Remaining: ${progress.remainingTasks}`,
		`Current Batch: ${progress.currentTask ?? "none"}`,
		"",
		"## Pulse Board",
		`- visible progress bar: ${renderProgressBar(safePercent)}`,
		`- progress pulse: ${safePercent}% complete`,
		`- active batch: ${progress.currentTask ?? "none"}`,
		`- active plan: ${progress.activePlanName ?? "not started"}`,
		"",
		"## Radar Panel",
		"| Signal | Reading |",
		"| --- | --- |",
		`| Status | ${progress.status} |`,
		`| Completion | ${safePercent}% |`,
		`| Completed Tasks | ${progress.completedTasks} |`,
		`| Remaining Tasks | ${progress.remainingTasks} |`,
		`| Current Batch | ${progress.currentTask ?? "none"} |`,
		"",
		"## Phases",
		...renderPhaseLines(safePercent),
		"",
		"## Detailed Batches",
		`- Active batch: ${progress.currentTask ?? "none"}`,
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
		"  State[Durable OMO state] --> Cockpit[.omo/cockpit renderer]",
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
	return [
		"# 진행상황",
		"",
		`미니 펄스: ${renderProgressBar(safePercent)} ${safePercent}%`,
		`미니 진행: ${progress.completedTasks}/${progress.totalTasks} 작업 완료, 남은 작업 ${progress.remainingTasks}개.`,
		`결론: 현재 진행률은 ${safePercent}%입니다.`,
		`근거: 다음 작업은 ${progress.currentTask ?? "없음"}입니다.`,
		`리스크: ${progress.warnings.length === 0 ? "큰 경고 없음." : progress.warnings.join(" / ")}`,
		`다음: ${progress.currentTask ?? "새 작업을 시작하세요."}`,
		"",
	].join("\n");
}

function renderGuardrails(model: CockpitModel): string {
	return [
		"# Agent Guardrails",
		"",
		"## Primary Cockpit files",
		...COCKPIT_FILE_NAMES.map((fileName) => `- .omo/cockpit/${fileName}`),
		"",
		"## Rules",
		"- Treat existing .omo/ulw-loop, .omo/start-work, and .omo/plans state as machine truth.",
		"- Do not create extra planning/status docs without explicit user approval.",
		"- Do not delete or rewrite legacy Cockpit files automatically.",
		"- Keep Korean user status in STATUS_KR.md, not in this guardrail file.",
		"",
		"## Legacy files detected",
		...listOrNone(model.legacyFilesDetected),
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

function renderProgressBar(percent: number, barWidth = 20): string {
	const safePercent = normalizePercent(percent);
	const filledCells = Math.round((safePercent / 100) * barWidth);
	const emptyCells = barWidth - filledCells;
	const filled = process.env["OMO_COCKPIT_ASCII"] === "1" ? "#" : "█";
	const empty = process.env["OMO_COCKPIT_ASCII"] === "1" ? "-" : "░";

	return `[${filled.repeat(filledCells)}${empty.repeat(emptyCells)}]`;
}

function renderPhaseLines(percent: number): string[] {
	const phases = [
		{ label: "Phase 1: Foundation", start: 0, end: 25 },
		{ label: "Phase 2: Collectors and renderers", start: 25, end: 50 },
		{ label: "Phase 3: Hooks and skill sync", start: 50, end: 75 },
		{ label: "Phase 4: Verification", start: 75, end: 100 },
	];
	return phases.map((phase) => {
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
		return `- ${renderProgressBar(localPercent, 8)} ${phase.label} (${status})`;
	});
}
