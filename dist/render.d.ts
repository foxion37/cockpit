import type { CockpitModel, CockpitRenderedFiles, CockpitRenderOptions, KrBatchRenderedFiles } from "./types.js";
export declare function renderCockpitFiles(model: CockpitModel): CockpitRenderedFiles;
export declare function renderCockpitFiles(model: CockpitModel, options: CockpitRenderOptions & {
    profile: "default";
}): CockpitRenderedFiles;
export declare function renderCockpitFiles(model: CockpitModel, options: CockpitRenderOptions & {
    profile: "kr-batch";
}): KrBatchRenderedFiles;
