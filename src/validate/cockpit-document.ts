import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
	addInlineHtmlDiagnostics,
	addPlaceholderDiagnostics,
	countMatches,
	diagnostic,
	isInside,
	lineNumberForText,
	relativePath,
} from "./common.js";
import { REQUIRED_KR_BATCH_SECTIONS } from "./constants.js";
import type { CockpitValidationDiagnostic } from "./types.js";

export interface CockpitTextValidationContext {
	readonly repoRoot: string;
	readonly filePath: string;
	readonly maxLines: number;
	readonly diagnostics: CockpitValidationDiagnostic[];
}

export async function validateCockpitText(
	text: string,
	context: CockpitTextValidationContext,
): Promise<void> {
	const lines = text.split(/\r?\n/u);
	const filePath = relativePath(context.repoRoot, context.filePath);

	addInlineHtmlDiagnostics(text, lines, filePath, context.diagnostics);
	addPlaceholderDiagnostics(text, lines, filePath, context.diagnostics);
	validateRequiredSections(text, filePath, context.diagnostics);
	validateMermaidColorBlocks(text, filePath, context.diagnostics);
	await validateBatchLinks(text, lines, context);
	validateProgressRows(lines, filePath, context.diagnostics);
	validateCockpitLength(lines, filePath, context);
}

function validateRequiredSections(
	text: string,
	filePath: string,
	diagnostics: CockpitValidationDiagnostic[],
): void {
	for (const section of REQUIRED_KR_BATCH_SECTIONS) {
		if (!text.includes(section)) {
			diagnostics.push(
				diagnostic({
					code: "required_section_missing",
					filePath,
					message: `Missing required kr-batch section: ${section}`,
					detail: section,
				}),
			);
		}
	}
}

function validateMermaidColorBlocks(
	text: string,
	filePath: string,
	diagnostics: CockpitValidationDiagnostic[],
): void {
	const mermaidBlockCount = countMatches(text, /```mermaid\b/giu);
	if (mermaidBlockCount < 3) {
		diagnostics.push(
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
		diagnostics.push(
			diagnostic({
				code: "mermaid_classdef_missing",
				filePath,
				message: "Mermaid classDef color rules are required.",
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
		const progressCell = tableCells(line).find((cell) => /[█░]/u.test(cell));
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

function validateCockpitLength(
	lines: readonly string[],
	filePath: string,
	context: CockpitTextValidationContext,
): void {
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

function tableCells(line: string): string[] {
	const cells = line.split("|");
	if (cells.length <= 2) return [];
	return cells.slice(1, -1).map((cell) => cell.trim());
}
