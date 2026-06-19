import { type CockpitValidationResult } from "./validate.js";
export interface CockpitHookOptions {
    readonly strict?: boolean;
}
export declare class CockpitHookStrictError extends Error {
    readonly result: CockpitValidationResult;
    constructor(result: CockpitValidationResult);
}
export declare function runCockpitHook(input: unknown, options?: CockpitHookOptions): Promise<string>;
