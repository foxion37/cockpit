import type { CockpitValidationDiagnostic } from "./types.js";
export interface CockpitTextValidationContext {
    readonly repoRoot: string;
    readonly filePath: string;
    readonly maxLines: number;
    readonly diagnostics: CockpitValidationDiagnostic[];
}
export declare function validateCockpitText(text: string, context: CockpitTextValidationContext): Promise<void>;
