export declare const COCKPIT_DIR = ".cockpit";
export declare const COCKPIT_FILE_NAMES: readonly ["WORKPLAN.md", "ARCHITECTURE.md", "STATUS_KR.md", "AGENT_GUARDRAILS.md"];
export type CockpitFileName = (typeof COCKPIT_FILE_NAMES)[number];
export declare const COCKPIT_PROFILES: readonly ["default", "kr-batch"];
export type CockpitProfile = (typeof COCKPIT_PROFILES)[number];
export interface CockpitRenderOptions {
    readonly profile?: CockpitProfile;
}
export declare const KR_BATCH_FILE_NAMES: readonly ["COCKPIT_KR.md", "docs/batches/README.md", "docs/batches/current-batch.md"];
export type KrBatchFileName = (typeof KR_BATCH_FILE_NAMES)[number];
export type CockpitProgressStatus = "not_started" | "in_progress" | "complete" | "blocked" | "warning";
export interface CockpitProgressSummary {
    readonly status: CockpitProgressStatus;
    readonly totalTasks: number;
    readonly completedTasks: number;
    readonly remainingTasks: number;
    readonly percentComplete: number;
    readonly currentTask: string | null;
    readonly activePlanName: string | null;
    readonly warnings: readonly string[];
}
export type CockpitGraphSourceName = "codegraph" | "codebase-memory-mcp" | "understand-anything";
export type CockpitGraphSourceStatus = "available" | "unavailable" | "stale" | "unknown";
export interface CockpitGraphSource {
    readonly name: CockpitGraphSourceName;
    readonly status: CockpitGraphSourceStatus;
    readonly artifactPath: string | null;
    readonly note: string;
}
export type CockpitStateSourceStatus = "available" | "missing" | "warning";
export interface CockpitStateSource {
    readonly name: string;
    readonly path: string;
    readonly status: CockpitStateSourceStatus;
    readonly summary: string;
}
export interface CockpitGuardrail {
    readonly title: string;
    readonly body: string;
}
export interface CockpitModel {
    readonly progress: CockpitProgressSummary;
    readonly graphSources: readonly CockpitGraphSource[];
    readonly stateSources: readonly CockpitStateSource[];
    readonly legacyFilesDetected: readonly string[];
}
export type CockpitRenderedFiles = Record<CockpitFileName, string>;
export type KrBatchRenderedFiles = Record<KrBatchFileName, string>;
