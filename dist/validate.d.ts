import type { CockpitValidationOptions, CockpitValidationResult } from "./validate/types.js";
export type { CockpitValidationCode, CockpitValidationDiagnostic, CockpitValidationOptions, CockpitValidationProfile, CockpitValidationResult, } from "./validate/types.js";
export declare function validateCockpit(options: CockpitValidationOptions): Promise<CockpitValidationResult>;
