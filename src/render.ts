import { renderDefaultFiles } from "./render-default.js";
import { renderKrBatchFiles } from "./render-kr-batch.js";
import type {
	CockpitModel,
	CockpitRenderedFiles,
	CockpitRenderOptions,
	KrBatchRenderedFiles,
} from "./types.js";

export function renderCockpitFiles(model: CockpitModel): CockpitRenderedFiles;
export function renderCockpitFiles(
	model: CockpitModel,
	options: CockpitRenderOptions & { profile: "default" },
): CockpitRenderedFiles;
export function renderCockpitFiles(
	model: CockpitModel,
	options: CockpitRenderOptions & { profile: "kr-batch" },
): KrBatchRenderedFiles;
export function renderCockpitFiles(
	model: CockpitModel,
	options: CockpitRenderOptions = {},
): CockpitRenderedFiles | KrBatchRenderedFiles {
	if (options.profile === "kr-batch") {
		return renderKrBatchFiles(model);
	}

	return renderDefaultFiles(model);
}
