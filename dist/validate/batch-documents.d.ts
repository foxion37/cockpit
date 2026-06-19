import type { CockpitValidationDiagnostic } from "./types.js";
export declare function validateBatchDocs(repoRoot: string, context: {
    readonly maxLines: number;
    readonly diagnostics: CockpitValidationDiagnostic[];
}): Promise<void>;
