import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import { collectGraphSources } from "./graph-sources.js";
import type {
	CockpitModel,
	CockpitProgressStatus,
	CockpitProgressSummary,
	CockpitStateSource,
} from "./types.js";

const LEGACY_COCKPIT_FILES = [
	"DOCS_CONTRACT.md",
	"DOCS_CONTRACT_KR.md",
	"ACTIVE.md",
	"ACTIVE_KR.md",
	"STATUS.md",
	"ROADMAP.md",
	"ROADMAP_KR.md",
	"CHANGE_REQUESTS.md",
	"CHANGE_REQUESTS_KR.md",
	"architecture.md",
	"architecture_KR.md",
] as const;

type ProjectWork = {
	readonly activePlan: string;
	readonly planName: string;
	readonly status: string;
};

type Checklist = {
	readonly total: number;
	readonly remaining: number;
	readonly nextTaskLabel: string | null;
};

type UlwLoopFile = {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly mtimeMs: number;
};

export async function collectCockpitModel(
	repoRoot: string,
): Promise<CockpitModel> {
	const [progress, graphSources, stateSources, legacyFilesDetected] =
		await Promise.all([
			collectProgress(repoRoot),
			collectGraphSources(repoRoot),
			collectStateSources(repoRoot),
			detectLegacyFiles(repoRoot),
		]);
	return { progress, graphSources, stateSources, legacyFilesDetected };
}

async function collectProgress(
	repoRoot: string,
): Promise<CockpitProgressSummary> {
	const statePath = join(repoRoot, ".cockpit", "state.json");
	const stateText = await readOptionalText(statePath);
	if (stateText === null) {
		const ulwProgress = await collectUlwLoopProgress(repoRoot);
		return ulwProgress ?? progress("not_started", 0, 0, null, null, []);
	}
	const parsed = parseJsonRecord(stateText);
	if (parsed === null)
		return progress("warning", 0, 0, null, null, [
			`Malformed JSON: ${repoRelative(repoRoot, statePath)}`,
		]);
	const work = activeWork(parsed);
	if (work === null) return progress("not_started", 0, 0, null, null, []);
	const planPath = resolvePlanPath(repoRoot, work.activePlan);
	const planText = await readOptionalText(planPath);
	if (planText === null) {
		return progress("warning", 0, 0, null, work.planName, [
			`Missing active plan: ${repoRelative(repoRoot, planPath)}`,
		]);
	}
	const checklist = parsePlanChecklist(planText);
	const completed = checklist.total - checklist.remaining;
	const status = statusFromChecklist(checklist);
	return progress(
		status,
		checklist.total,
		completed,
		checklist.nextTaskLabel,
		work.planName,
		[],
	);
}

async function collectUlwLoopProgress(
	repoRoot: string,
): Promise<CockpitProgressSummary | null> {
	const goalsFile = await findLatestUlwLoopFile(repoRoot, "goals.json");
	if (goalsFile === null) return null;
	const text = await readOptionalText(goalsFile.absolutePath);
	if (text === null) return null;
	const parsed = parseJsonRecord(text);
	if (parsed === null)
		return progress("warning", 0, 0, null, ulwLoopPlanName(goalsFile), [
			`Malformed JSON: ${goalsFile.relativePath}`,
		]);
	const summary = summarizeGoals(parsed);
	return progress(
		summary.status,
		summary.totalCriteria,
		summary.passedCriteria,
		summary.nextCriterionId,
		ulwLoopPlanName(goalsFile),
		[],
	);
}

function progress(
	status: CockpitProgressStatus,
	totalTasks: number,
	completedTasks: number,
	currentTask: string | null,
	activePlanName: string | null,
	warnings: readonly string[],
): CockpitProgressSummary {
	const remainingTasks = Math.max(totalTasks - completedTasks, 0);
	const percentComplete =
		totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
	return {
		status,
		totalTasks,
		completedTasks,
		remainingTasks,
		percentComplete,
		currentTask,
		activePlanName,
		warnings,
	};
}

function statusFromChecklist(checklist: Checklist): CockpitProgressStatus {
	if (checklist.total === 0) return "not_started";
	return checklist.remaining === 0 ? "complete" : "in_progress";
}

function activeWork(state: Record<string, unknown>): ProjectWork | null {
	const works = state["works"];
	const candidates = isRecord(works) ? Object.values(works) : [state];
	for (const candidate of candidates) {
		const work = parseWork(candidate);
		if (work !== null && (work.status === "active" || work.status === "paused"))
			return work;
	}
	return null;
}

function parseWork(value: unknown): ProjectWork | null {
	if (!isRecord(value)) return null;
	const activePlan = value["active_plan"];
	const planName = value["plan_name"];
	const status = value["status"];
	if (
		typeof activePlan !== "string" ||
		typeof planName !== "string" ||
		typeof status !== "string"
	)
		return null;
	return { activePlan, planName, status };
}

function parsePlanChecklist(markdown: string): Checklist {
	const lines = markdown.split(/\r?\n/);
	const hasCountedSections = lines.some((line) =>
		isCountedHeading(parseLevelTwoHeading(line)),
	);
	let isCountedSection = !hasCountedSections;
	let total = 0;
	let remaining = 0;
	let nextTaskLabel: string | null = null;
	for (const line of lines) {
		const heading = parseLevelTwoHeading(line);
		if (heading !== null) isCountedSection = isCountedHeading(heading);
		if (!isCountedSection || !/^- \[[ xX]\] /.test(line)) continue;
		total += 1;
		if (!/^- \[ \] /.test(line)) continue;
		remaining += 1;
		if (nextTaskLabel === null) nextTaskLabel = line.slice("- [ ] ".length);
	}
	return { total, remaining, nextTaskLabel };
}

function parseLevelTwoHeading(line: string): string | null {
	if (!line.startsWith("## ") || line.startsWith("### ")) return null;
	return line.slice("## ".length).trim();
}

function isCountedHeading(heading: string | null): boolean {
	return heading === "TODOs" || heading === "Final Verification Wave";
}

async function detectLegacyFiles(repoRoot: string): Promise<string[]> {
	const found: string[] = [];
	for (const fileName of LEGACY_COCKPIT_FILES) {
		if (await fileExistsExactCase(repoRoot, fileName)) found.push(fileName);
		const cockpitRelativePath = join(".cockpit", fileName);
		if (await fileExistsExactCase(repoRoot, cockpitRelativePath))
			found.push(cockpitRelativePath);
	}
	return found;
}

async function fileExistsExactCase(
	repoRoot: string,
	relativePath: string,
): Promise<boolean> {
	const absolutePath = join(repoRoot, relativePath);
	const entries = await readDirNamesOptional(dirname(absolutePath));
	if (!entries.includes(basename(absolutePath))) return false;
	return (await readOptionalText(absolutePath)) !== null;
}

async function readDirNamesOptional(path: string): Promise<string[]> {
	try {
		return await readdir(path);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return [];
		throw error;
	}
}

async function collectStateSources(
	repoRoot: string,
): Promise<CockpitStateSource[]> {
	return [
		await summarizeJsonlSource(
			repoRoot,
			"start-work ledger",
			".cockpit/start-work/ledger.jsonl",
		),
		await summarizeUlwLoopGoals(repoRoot),
		await summarizeUlwLoopLedger(repoRoot),
	];
}

async function summarizeJsonlSource(
	repoRoot: string,
	name: string,
	relativePath: string,
): Promise<CockpitStateSource> {
	return summarizeJsonlSourceAt(
		name,
		relativePath,
		join(repoRoot, relativePath),
	);
}

async function summarizeUlwLoopGoals(
	repoRoot: string,
): Promise<CockpitStateSource> {
	const source = await findLatestUlwLoopFile(repoRoot, "goals.json");
	const relativePath = source?.relativePath ?? ".cockpit/ulw-loop/goals.json";
	const text =
		source === null ? null : await readOptionalText(source.absolutePath);
	if (text === null)
		return {
			name: "ulw-loop goals",
			path: relativePath,
			status: "missing",
			summary: "not present",
		};
	const parsed = parseJsonRecord(text);
	if (parsed === null)
		return {
			name: "ulw-loop goals",
			path: relativePath,
			status: "warning",
			summary: "malformed JSON",
		};
	const summary = summarizeGoals(parsed);
	return {
		name: "ulw-loop goals",
		path: relativePath,
		status: "available",
		summary: `${summary.goalCount} goal(s), ${summary.passedCriteria}/${summary.totalCriteria} criterion pass`,
	};
}

async function summarizeUlwLoopLedger(
	repoRoot: string,
): Promise<CockpitStateSource> {
	const source = await findLatestUlwLoopFile(repoRoot, "ledger.jsonl");
	if (source === null)
		return {
			name: "ulw-loop ledger",
			path: ".cockpit/ulw-loop/ledger.jsonl",
			status: "missing",
			summary: "not present",
		};
	return summarizeJsonlSourceAt(
		"ulw-loop ledger",
		source.relativePath,
		source.absolutePath,
	);
}

async function summarizeJsonlSourceAt(
	name: string,
	relativePath: string,
	absolutePath: string,
): Promise<CockpitStateSource> {
	const text = await readOptionalText(absolutePath);
	if (text === null)
		return {
			name,
			path: relativePath,
			status: "missing",
			summary: "not present",
		};
	const lines = nonBlankLines(text);
	if (!lines.every(isValidJsonLine))
		return {
			name,
			path: relativePath,
			status: "warning",
			summary: "malformed JSONL",
		};
	return {
		name,
		path: relativePath,
		status: "available",
		summary: `${lines.length} event(s)`,
	};
}

function summarizeGoals(state: Record<string, unknown>): {
	readonly goalCount: number;
	readonly totalCriteria: number;
	readonly passedCriteria: number;
	readonly nextCriterionId: string | null;
	readonly status: CockpitProgressStatus;
} {
	const goals = Array.isArray(state["goals"]) ? state["goals"] : [];
	const criteria = goals.flatMap((goal) =>
		isRecord(goal) && Array.isArray(goal["successCriteria"])
			? goal["successCriteria"]
			: [],
	);
	const passedCriteria = criteria.filter(
		(criterion) => isRecord(criterion) && criterion["status"] === "pass",
	).length;
	const nextCriterion = criteria.find(
		(criterion) => !isRecord(criterion) || criterion["status"] !== "pass",
	);
	const hasBlocked = criteria.some(
		(criterion) => isRecord(criterion) && criterion["status"] === "blocked",
	);
	const hasFailed = criteria.some(
		(criterion) => isRecord(criterion) && criterion["status"] === "fail",
	);
	return {
		goalCount: goals.length,
		totalCriteria: criteria.length,
		passedCriteria,
		nextCriterionId:
			isRecord(nextCriterion) && typeof nextCriterion["id"] === "string"
				? nextCriterion["id"]
				: null,
		status:
			criteria.length === 0
				? "not_started"
				: hasBlocked
					? "blocked"
					: hasFailed
						? "warning"
						: passedCriteria === criteria.length
							? "complete"
							: "in_progress",
	};
}

async function findLatestUlwLoopFile(
	repoRoot: string,
	fileName: "goals.json" | "ledger.jsonl",
): Promise<UlwLoopFile | null> {
	const basePath = join(repoRoot, ".cockpit", "ulw-loop");
	const candidates: UlwLoopFile[] = [];
	await pushUlwLoopCandidate(
		candidates,
		join(basePath, fileName),
		join(".cockpit", "ulw-loop", fileName),
	);
	const entries = await readDirOptional(basePath);
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		await pushUlwLoopCandidate(
			candidates,
			join(basePath, entry.name, fileName),
			join(".cockpit", "ulw-loop", entry.name, fileName),
		);
	}
	return (
		candidates.sort(
			(left, right) =>
				right.mtimeMs - left.mtimeMs ||
				left.relativePath.localeCompare(right.relativePath),
		)[0] ?? null
	);
}

async function pushUlwLoopCandidate(
	candidates: UlwLoopFile[],
	absolutePath: string,
	relativePath: string,
): Promise<void> {
	const stats = await statOptional(absolutePath);
	if (stats === null || !stats.isFile()) return;
	candidates.push({ absolutePath, relativePath, mtimeMs: stats.mtimeMs });
}

async function readDirOptional(path: string) {
	try {
		return await readdir(path, { withFileTypes: true });
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return [];
		throw error;
	}
}

async function statOptional(path: string) {
	try {
		return await stat(path);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return null;
		throw error;
	}
}

function ulwLoopPlanName(file: UlwLoopFile): string {
	const parts = file.relativePath.split("/");
	return parts.length >= 4 ? `ulw-loop/${parts[2]}` : "ulw-loop";
}

function nonBlankLines(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

function isValidJsonLine(line: string): boolean {
	try {
		JSON.parse(line);
		return true;
	} catch (error) {
		if (error instanceof SyntaxError) return false;
		throw error;
	}
}

function resolvePlanPath(repoRoot: string, activePlan: string): string {
	return isAbsolute(activePlan) ? activePlan : resolve(repoRoot, activePlan);
}

async function readOptionalText(path: string): Promise<string | null> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return null;
		throw error;
	}
}

function parseJsonRecord(json: string): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(json);
		return isRecord(parsed) ? parsed : null;
	} catch (error) {
		if (error instanceof SyntaxError) return null;
		throw error;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function repoRelative(repoRoot: string, path: string): string {
	return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}
