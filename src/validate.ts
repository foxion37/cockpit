import { access, readdir, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type CockpitValidationProfile = "kr-batch";

export type CockpitValidationCode =
	| "cockpit_file_missing"
	| "forbidden_inline_html"
	| "forbidden_placeholder"
	| "empty_checkbox"
	| "required_section_missing"
	| "mermaid_block_missing"
	| "mermaid_classdef_missing"
	| "batch_link_missing"
	| "batch_link_unresolved"
	| "cockpit_too_long"
	| "progress_bar_missing"
	| "progress_alignment_delimiter"
	| "progress_bar_not_left_aligned"
	| "progress_percentage_missing"
	| "batch_doc_forbidden_inline_html"
	| "batch_doc_forbidden_placeholder"
	| "batch_doc_empty_checkbox"
	| "batch_doc_missing_content"
	| "batch_doc_too_long";

export interface CockpitValidationOptions {
	readonly repoRoot: string;
	readonly profile?: CockpitValidationProfile;
	readonly cockpitPath?: string;
	readonly maxCockpitLines?: number;
	readonly maxBatchDocLines?: number;
}

export interface CockpitValidationDiagnostic {
	readonly code: CockpitValidationCode;
	readonly severity: "error";
	readonly filePath: string;
	readonly message: string;
	readonly lineNumber?: number;
	readonly detail?: string;
}

export interface CockpitValidationResult {
	readonly ok: boolean;
	readonly profile: CockpitValidationProfile;
	readonly diagnostics: readonly CockpitValidationDiagnostic[];
}

const DEFAULT_MAX_COCKPIT_LINES = 170;
const DEFAULT_MAX_BATCH_DOC_LINES = 220;

const REQUIRED_KR_BATCH_SECTIONS = [
	"## 한눈에 보기",
	"## 1. 전체 목표와 목표별 진행률",
	"## 2. 배치 구분과 배치별 진행률",
	"## 3. 이번 세션에서 달성한 진행률",
	"## 지금 사용자가 알면 되는 것",
	"## 다음 단계",
] as const;

const INLINE_HTML_PATTERNS = [
	{ pattern: /<span\b/iu, detail: "<span" },
	{ pattern: /<\/span>/iu, detail: "</span>" },
	{ pattern: /style\s*=/iu, detail: "style=" },
] as const;

const PLACEHOLDER_PATTERNS = [
	{ pattern: /\bTODO\b/iu, detail: "TODO" },
	{ pattern: /\bTBD\b/iu, detail: "TBD" },
	{ pattern: /\bundefined\b/iu, detail: "undefined" },
] as const;

export async function validateCockpit(
	options: CockpitValidationOptions,
): Promise<CockpitValidationResult> {
	const profile = options.profile ?? "kr-batch";
	const repoRoot = resolve(options.repoRoot);
	const cockpitPath = resolve(
		options.cockpitPath ?? `${repoRoot}/COCKPIT_KR.md`,
	);
	const diagnostics: CockpitValidationDiagnostic[] = [];

	let cockpitText: string;
	try {
		cockpitText = await readFile(cockpitPath, "utf8");
	} catch {
		diagnostics.push(
			diagnostic({
				code: "cockpit_file_missing",
				filePath: relativePath(repoRoot, cockpitPath),
				message: "COCKPIT_KR.md is required for kr-batch validation.",
			}),
		);
		return { ok: false, profile, diagnostics };
	}

	await validateCockpitText(cockpitText, {
		repoRoot,
		filePath: cockpitPath,
		maxLines: options.maxCockpitLines ?? DEFAULT_MAX_COCKPIT_LINES,
		diagnostics,
	});

	await validateBatchDocs(repoRoot, {
		maxLines: options.maxBatchDocLines ?? DEFAULT_MAX_BATCH_DOC_LINES,
		diagnostics,
	});

	return { ok: diagnostics.length === 0, profile, diagnostics };
}

interface CockpitTextValidationContext {
	readonly repoRoot: string;
	readonly filePath: string;
	readonly maxLines: number;
	readonly diagnostics: CockpitValidationDiagnostic[];
}

async function validateCockpitText(
	text: string,
	context: CockpitTextValidationContext,
): Promise<void> {
	const lines = text.split(/\r?\n/u);
	const filePath = relativePath(context.repoRoot, context.filePath);

	addInlineHtmlDiagnostics(text, lines, filePath, context.diagnostics);
	addPlaceholderDiagnostics(text, lines, filePath, context.diagnostics);

	for (const section of REQUIRED_KR_BATCH_SECTIONS) {
		if (!text.includes(section)) {
			context.diagnostics.push(
				diagnostic({
					code: "required_section_missing",
					filePath,
					message: `Missing required kr-batch section: ${section}`,
					detail: section,
				}),
			);
		}
	}

	const mermaidBlockCount = countMatches(text, /```mermaid\b/giu);
	if (mermaidBlockCount < 3) {
		context.diagnostics.push(
			diagnostic({
				code: "mermaid_block_missing",
				filePath,
				message:
					"At least three Mermaid blocks are required for visible status color.",
				detail: String(mermaidBlockCount),
			}),
		);
	}

	if (!/\bclassDef\b/u.test(text)) {
		context.diagnostics.push(
			diagnostic({
				code: "mermaid_classdef_missing",
				filePath,
				message: "Mermaid classDef color rules are required.",
			}),
		);
	}

	await validateBatchLinks(text, lines, context);
	validateProgressRows(lines, filePath, context.diagnostics);

	if (lines.length > context.maxLines) {
		context.diagnostics.push(
			diagnostic({
				code: "cockpit_too_long",
				filePath,
				message: `Cockpit should stay short; found ${lines.length} lines.`,
				detail: `${lines.length}/${context.maxLines}`,
			}),
		);
	}
}

async function validateBatchLinks(
	text: string,
	lines: readonly string[],
	context: CockpitTextValidationContext,
): Promise<void> {
	const filePath = relativePath(context.repoRoot, context.filePath);
	const links = extractBatchLinks(text);
	if (links.length === 0) {
		context.diagnostics.push(
			diagnostic({
				code: "batch_link_missing",
				filePath,
				message: "Cockpit should hand detailed notes off to docs/batches/.",
			}),
		);
		return;
	}

	for (const link of links) {
		const targetPath = resolve(context.repoRoot, link);
		if (!isInside(context.repoRoot, targetPath)) {
			context.diagnostics.push(
				diagnostic({
					code: "batch_link_unresolved",
					filePath,
					lineNumber: lineNumberForText(lines, link),
					message: `Batch detail link escapes the repo root: ${link}`,
					detail: link,
				}),
			);
			continue;
		}

		try {
			await access(targetPath);
		} catch {
			context.diagnostics.push(
				diagnostic({
					code: "batch_link_unresolved",
					filePath,
					lineNumber: lineNumberForText(lines, link),
					message: `Linked batch detail document does not exist: ${link}`,
					detail: link,
				}),
			);
		}
	}
}

function validateProgressRows(
	lines: readonly string[],
	filePath: string,
	diagnostics: CockpitValidationDiagnostic[],
): void {
	const progressRows = lines
		.map((line, index) => ({ line, lineNumber: index + 1 }))
		.filter(({ line }) => /[█░]/u.test(line));

	for (const { line, lineNumber } of lines
		.map((line, index) => ({ line, lineNumber: index + 1 }))
		.filter(({ line }) => /^\s*\|.*---:.*\|\s*$/u.test(line))) {
		diagnostics.push(
			diagnostic({
				code: "progress_alignment_delimiter",
				filePath,
				lineNumber,
				message:
					"Progress table delimiters must not right-align cells with ---:.",
				detail: line,
			}),
		);
	}

	if (progressRows.length === 0) {
		diagnostics.push(
			diagnostic({
				code: "progress_bar_missing",
				filePath,
				message: "At least one visible progress bar row is required.",
			}),
		);
		return;
	}

	for (const { line, lineNumber } of progressRows) {
		const cells = tableCells(line);
		const progressCell = cells.find((cell) => /[█░]/u.test(cell));
		if (progressCell === undefined || !/^[█░]/u.test(progressCell.trim())) {
			diagnostics.push(
				diagnostic({
					code: "progress_bar_not_left_aligned",
					filePath,
					lineNumber,
					message:
						"Progress bars must start at the left edge of the progress cell.",
					detail: line,
				}),
			);
		}

		if (!/\d{1,3}%/u.test(line)) {
			diagnostics.push(
				diagnostic({
					code: "progress_percentage_missing",
					filePath,
					lineNumber,
					message: "Progress rows must expose a visible percentage.",
					detail: line,
				}),
			);
		}
	}
}

async function validateBatchDocs(
	repoRoot: string,
	context: {
		readonly maxLines: number;
		readonly diagnostics: CockpitValidationDiagnostic[];
	},
): Promise<void> {
	const batchDir = resolve(repoRoot, "docs", "batches");
	let entries: string[];
	try {
		entries = await readdir(batchDir);
	} catch {
		return;
	}

	for (const entry of entries.sort()) {
		if (!entry.endsWith(".md")) continue;
		const path = resolve(batchDir, entry);
		const text = await readFile(path, "utf8");
		const lines = text.split(/\r?\n/u);
		const filePath = relativePath(repoRoot, path);

		addInlineHtmlDiagnostics(
			text,
			lines,
			filePath,
			context.diagnostics,
			"batch_doc_forbidden_inline_html",
		);
		addPlaceholderDiagnostics(
			text,
			lines,
			filePath,
			context.diagnostics,
			"batch_doc_forbidden_placeholder",
			"batch_doc_empty_checkbox",
		);

		if (entry !== "README.md" && !hasBatchDetailContent(text)) {
			context.diagnostics.push(
				diagnostic({
					code: "batch_doc_missing_content",
					filePath,
					message:
						"Batch detail docs should show goal, progress, and check content.",
				}),
			);
		}

		if (lines.length > context.maxLines) {
			context.diagnostics.push(
				diagnostic({
					code: "batch_doc_too_long",
					filePath,
					message: `Batch detail doc should stay concise; found ${lines.length} lines.`,
					detail: `${lines.length}/${context.maxLines}`,
				}),
			);
		}
	}
}

function addInlineHtmlDiagnostics(
	text: string,
	lines: readonly string[],
	filePath: string,
	diagnostics: CockpitValidationDiagnostic[],
	code: CockpitValidationCode = "forbidden_inline_html",
): void {
	for (const { pattern, detail } of INLINE_HTML_PATTERNS) {
		if (!pattern.test(text)) continue;
		diagnostics.push(
			diagnostic({
				code,
				filePath,
				lineNumber: lineNumberForPattern(lines, pattern),
				message: `Inline HTML style/span marker is not allowed: ${detail}`,
				detail,
			}),
		);
	}
}

function addPlaceholderDiagnostics(
	text: string,
	lines: readonly string[],
	filePath: string,
	diagnostics: CockpitValidationDiagnostic[],
	placeholderCode: CockpitValidationCode = "forbidden_placeholder",
	emptyCheckboxCode: CockpitValidationCode = "empty_checkbox",
): void {
	for (const { pattern, detail } of PLACEHOLDER_PATTERNS) {
		if (!pattern.test(text)) continue;
		diagnostics.push(
			diagnostic({
				code: placeholderCode,
				filePath,
				lineNumber: lineNumberForPattern(lines, pattern),
				message: `Placeholder scrap is not allowed: ${detail}`,
				detail,
			}),
		);
	}

	const emptyCheckboxPattern = /\[ \]/u;
	if (emptyCheckboxPattern.test(text)) {
		diagnostics.push(
			diagnostic({
				code: emptyCheckboxCode,
				filePath,
				lineNumber: lineNumberForPattern(lines, emptyCheckboxPattern),
				message: "Empty checkboxes are not allowed in strict Cockpit output.",
				detail: "[ ]",
			}),
		);
	}
}

function extractBatchLinks(text: string): string[] {
	const links = new Set<string>();
	for (const match of text.matchAll(/`(docs\/batches\/[^`]+\.md)`/giu)) {
		const link = match[1];
		if (link !== undefined) links.add(link);
	}
	for (const match of text.matchAll(
		/\[[^\]]+\]\((docs\/batches\/[^)]+\.md)\)/giu,
	)) {
		const link = match[1];
		if (link !== undefined) links.add(link);
	}
	return [...links].sort();
}

function hasBatchDetailContent(text: string): boolean {
	return /##/u.test(text) && /진행률/u.test(text) && /확인/u.test(text);
}

function tableCells(line: string): string[] {
	const cells = line.split("|");
	if (cells.length <= 2) return [];
	return cells.slice(1, -1).map((cell) => cell.trim());
}

function countMatches(text: string, pattern: RegExp): number {
	return [...text.matchAll(pattern)].length;
}

function lineNumberForText(
	lines: readonly string[],
	text: string,
): number | undefined {
	const index = lines.findIndex((line) => line.includes(text));
	return index === -1 ? undefined : index + 1;
}

function lineNumberForPattern(
	lines: readonly string[],
	pattern: RegExp,
): number | undefined {
	const index = lines.findIndex((line) => pattern.test(line));
	return index === -1 ? undefined : index + 1;
}

function relativePath(repoRoot: string, path: string): string {
	const result = relative(repoRoot, path);
	return result.split(sep).join("/");
}

function isInside(root: string, path: string): boolean {
	const result = relative(root, path);
	return result === "" || (!result.startsWith("..") && !isAbsolute(result));
}

interface DiagnosticInput {
	readonly code: CockpitValidationCode;
	readonly filePath: string;
	readonly message: string;
	readonly lineNumber?: number | undefined;
	readonly detail?: string | undefined;
}

function diagnostic(input: DiagnosticInput): CockpitValidationDiagnostic {
	const base = {
		code: input.code,
		severity: "error" as const,
		filePath: input.filePath,
		message: input.message,
	};
	return {
		...base,
		...(input.lineNumber === undefined ? {} : { lineNumber: input.lineNumber }),
		...(input.detail === undefined ? {} : { detail: input.detail }),
	};
}
