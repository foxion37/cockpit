import { fixedColumns, listOrNone, normalizePercent, pipeColumns, renderDotCells, renderProgressBar, } from "./render-common.js";
import { renderStatusKr } from "./render-default-status.js";
import { COCKPIT_FILE_NAMES, } from "./types.js";
export function renderDefaultFiles(model) {
    return {
        "WORKPLAN.md": renderWorkplan(model),
        "ARCHITECTURE.md": renderArchitecture(model),
        "STATUS_KR.md": renderStatusKr(model),
        "AGENT_GUARDRAILS.md": renderGuardrails(model),
    };
}
function renderWorkplan(model) {
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
        ...model.stateSources.map((source) => `| ${source.name} | ${source.status} | ${source.path} | ${source.summary} |`),
        "",
        "## Warnings",
        ...listOrNone(progress.warnings),
        "",
    ].join("\n");
}
function renderArchitecture(model) {
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
        ...model.graphSources.map((source) => `| ${source.name} | ${source.artifactPath ?? "no artifact"} | ${source.status} |`),
        "",
        "## Graph Sources",
        "| Source | Status | Artifact | Note |",
        "| --- | --- | --- | --- |",
        ...model.graphSources.map((source) => `| ${source.name} | ${source.status} | ${source.artifactPath ?? "none"} | ${source.note} |`),
        "",
    ].join("\n");
}
function renderGuardrails(model) {
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
function renderWorkplanPulseRows(model, safePercent) {
    const { progress } = model;
    const currentTask = progress.currentTask ?? "none";
    const activePlanName = progress.activePlanName ?? "not started";
    return [
        fixedColumns([
            "overall",
            `${safePercent}%`,
            renderProgressBar(safePercent),
            progress.status,
        ], 10),
        fixedColumns([
            "plan",
            `${safePercent}%`,
            renderProgressBar(safePercent),
            activePlanName,
        ], 10),
        fixedColumns([
            "tasks",
            `${progress.completedTasks}/${progress.totalTasks}`,
            renderDotCells(progress.completedTasks, progress.totalTasks),
            `remaining ${progress.remainingTasks}`,
        ], 10),
        fixedColumns([
            "batch",
            `${safePercent}%`,
            renderProgressBar(safePercent, 12),
            currentTask,
        ], 10),
    ];
}
function renderPhaseLines(percent) {
    const phases = [
        { label: "Phase 1: Foundation", start: 0, end: 25 },
        { label: "Phase 2: Collectors and renderers", start: 25, end: 50 },
        { label: "Phase 3: Hooks and skill sync", start: 50, end: 75 },
        { label: "Phase 4: Verification", start: 75, end: 100 },
    ];
    const phaseSnapshots = phases.map((phase) => {
        const span = phase.end - phase.start;
        const localPercent = normalizePercent(((percent - phase.start) / span) * 100);
        const status = localPercent >= 100
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
    const detailRows = phaseSnapshots.map((phase) => pipeColumns([
        phase.label,
        `${phase.localPercent}%`,
        renderProgressBar(phase.localPercent, 8),
        phase.status,
    ]));
    const compactRows = phaseSnapshots.map((phase) => fixedColumns([
        phase.compactLabel,
        `${phase.localPercent}%`,
        renderProgressBar(phase.localPercent, 8),
    ], 9));
    return [...detailRows, "", ...compactRows];
}
