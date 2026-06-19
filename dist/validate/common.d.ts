import type { CockpitValidationCode, CockpitValidationDiagnostic, DiagnosticInput } from "./types.js";
export declare function addInlineHtmlDiagnostics(text: string, lines: readonly string[], filePath: string, diagnostics: CockpitValidationDiagnostic[], code?: CockpitValidationCode): void;
export declare function addPlaceholderDiagnostics(text: string, lines: readonly string[], filePath: string, diagnostics: CockpitValidationDiagnostic[], placeholderCode?: CockpitValidationCode, emptyCheckboxCode?: CockpitValidationCode): void;
export declare function countMatches(text: string, pattern: RegExp): number;
export declare function lineNumberForText(lines: readonly string[], text: string): number | undefined;
export declare function lineNumberForPattern(lines: readonly string[], pattern: RegExp): number | undefined;
export declare function relativePath(repoRoot: string, path: string): string;
export declare function isInside(root: string, path: string): boolean;
export declare function diagnostic(input: DiagnosticInput): CockpitValidationDiagnostic;
