import { type CockpitProfile } from "./types.js";
export interface CockpitUpdateResult {
    readonly files: readonly string[];
    readonly legacyFilesDetected: readonly string[];
    readonly warnings: readonly string[];
}
export interface CockpitUpdateOptions {
    readonly profile?: CockpitProfile;
}
export declare function updateCockpit(repoRoot: string, options?: CockpitUpdateOptions): Promise<CockpitUpdateResult>;
export declare function cockpitEvidencePath(repoRoot: string, fileName: string): string;
