import { isAbsolute, relative, sep } from "node:path";

import { INLINE_HTML_PATTERNS, PLACEHOLDER_PATTERNS } from "./constants.js";
import type {
	CockpitValidationCode,
	CockpitValidationDiagnostic,
	DiagnosticInput,
} from "./types.js";

export function addInlineHtmlDiagnostics(
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

export function addPlaceholderDiagnostics(
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

export function countMatches(text: string, pattern: RegExp): number {
	return [...text.matchAll(pattern)].length;
}

export function lineNumberForText(
	lines: readonly string[],
	text: string,
): number | undefined {
	const index = lines.findIndex((line) => line.includes(text));
	return index === -1 ? undefined : index + 1;
}

export function lineNumberForPattern(
	lines: readonly string[],
	pattern: RegExp,
): number | undefined {
	const index = lines.findIndex((line) => pattern.test(line));
	return index === -1 ? undefined : index + 1;
}

export function relativePath(repoRoot: string, path: string): string {
	const result = relative(repoRoot, path);
	return result.split(sep).join("/");
}

export function isInside(root: string, path: string): boolean {
	const result = relative(root, path);
	return result === "" || (!result.startsWith("..") && !isAbsolute(result));
}

export function diagnostic(
	input: DiagnosticInput,
): CockpitValidationDiagnostic {
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
