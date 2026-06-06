import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { collectCockpitModel } from "./collect.js";
import { cockpitDir, cockpitFilePath } from "./paths.js";
import { renderCockpitFiles } from "./render.js";
import { COCKPIT_FILE_NAMES } from "./types.js";

export interface CockpitUpdateResult {
	readonly files: readonly string[];
	readonly legacyFilesDetected: readonly string[];
	readonly warnings: readonly string[];
}

export async function updateCockpit(
	repoRoot: string,
): Promise<CockpitUpdateResult> {
	const model = await collectCockpitModel(repoRoot);
	const rendered = renderCockpitFiles(model);
	await mkdir(cockpitDir(repoRoot), { recursive: true });
	const files: string[] = [];
	for (const fileName of COCKPIT_FILE_NAMES) {
		const path = cockpitFilePath(repoRoot, fileName);
		await writeFile(path, ensureFinalNewline(rendered[fileName]), "utf8");
		files.push(path);
	}
	return {
		files,
		legacyFilesDetected: model.legacyFilesDetected,
		warnings: model.progress.warnings,
	};
}

export function cockpitEvidencePath(
	repoRoot: string,
	fileName: string,
): string {
	return join(cockpitDir(repoRoot), fileName);
}

function ensureFinalNewline(value: string): string {
	return value.endsWith("\n") ? value : `${value}\n`;
}
