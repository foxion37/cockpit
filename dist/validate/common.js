import { isAbsolute, relative, sep } from "node:path";
import { INLINE_HTML_PATTERNS, PLACEHOLDER_PATTERNS } from "./constants.js";
export function addInlineHtmlDiagnostics(text, lines, filePath, diagnostics, code = "forbidden_inline_html") {
    for (const { pattern, detail } of INLINE_HTML_PATTERNS) {
        if (!pattern.test(text))
            continue;
        diagnostics.push(diagnostic({
            code,
            filePath,
            lineNumber: lineNumberForPattern(lines, pattern),
            message: `Inline HTML style/span marker is not allowed: ${detail}`,
            detail,
        }));
    }
}
export function addPlaceholderDiagnostics(text, lines, filePath, diagnostics, placeholderCode = "forbidden_placeholder", emptyCheckboxCode = "empty_checkbox") {
    for (const { pattern, detail } of PLACEHOLDER_PATTERNS) {
        if (!pattern.test(text))
            continue;
        diagnostics.push(diagnostic({
            code: placeholderCode,
            filePath,
            lineNumber: lineNumberForPattern(lines, pattern),
            message: `Placeholder scrap is not allowed: ${detail}`,
            detail,
        }));
    }
    const emptyCheckboxPattern = /\[ \]/u;
    if (emptyCheckboxPattern.test(text)) {
        diagnostics.push(diagnostic({
            code: emptyCheckboxCode,
            filePath,
            lineNumber: lineNumberForPattern(lines, emptyCheckboxPattern),
            message: "Empty checkboxes are not allowed in strict Cockpit output.",
            detail: "[ ]",
        }));
    }
}
export function countMatches(text, pattern) {
    return [...text.matchAll(pattern)].length;
}
export function lineNumberForText(lines, text) {
    const index = lines.findIndex((line) => line.includes(text));
    return index === -1 ? undefined : index + 1;
}
export function lineNumberForPattern(lines, pattern) {
    const index = lines.findIndex((line) => pattern.test(line));
    return index === -1 ? undefined : index + 1;
}
export function relativePath(repoRoot, path) {
    const result = relative(repoRoot, path);
    return result.split(sep).join("/");
}
export function isInside(root, path) {
    const result = relative(root, path);
    return result === "" || (!result.startsWith("..") && !isAbsolute(result));
}
export function diagnostic(input) {
    const base = {
        code: input.code,
        severity: "error",
        filePath: input.filePath,
        message: input.message,
    };
    return {
        ...base,
        ...(input.lineNumber === undefined ? {} : { lineNumber: input.lineNumber }),
        ...(input.detail === undefined ? {} : { detail: input.detail }),
    };
}
