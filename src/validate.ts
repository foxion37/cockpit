import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateBatchDocs } from "./validate/batch-documents.js";
import { validateCockpitText } from "./validate/cockpit-document.js";
import { diagnostic, relativePath } from "./validate/common.js";
import {
	DEFAULT_MAX_BATCH_DOC_LINES,
	DEFAULT_MAX_COCKPIT_LINES,
} from "./validate/constants.js";
import type {
	CockpitValidationDiagnostic,
	CockpitValidationOptions,
	CockpitValidationResult,
} from "./validate/types.js";

export type {
	CockpitValidationCode,
	CockpitValidationDiagnostic,
	CockpitValidationOptions,
	CockpitValidationProfile,
	CockpitValidationResult,
} from "./validate/types.js";

export async function validateCockpit(
	options: CockpitValidationOptions,
): Promise<CockpitValidationResult> {
	const profile = options.profile ?? "kr-batch";
	const repoRoot = resolve(options.repoRoot);
	const cockpitPath = resolve(
		options.cockpitPath ?? `${repoRoot}/COCKPIT_KR.md`,
	);
	const diagnostics: CockpitValidationDiagnostic[] = [];

	let cockpitText: string;
	try {
		cockpitText = await readFile(cockpitPath, "utf8");
	} catch {
		diagnostics.push(
			diagnostic({
				code: "cockpit_file_missing",
				filePath: relativePath(repoRoot, cockpitPath),
				message: "COCKPIT_KR.md is required for kr-batch validation.",
			}),
		);
		return { ok: false, profile, diagnostics };
	}

	await validateCockpitText(cockpitText, {
		repoRoot,
		filePath: cockpitPath,
		maxLines: options.maxCockpitLines ?? DEFAULT_MAX_COCKPIT_LINES,
		diagnostics,
	});

	await validateBatchDocs(repoRoot, {
		maxLines: options.maxBatchDocLines ?? DEFAULT_MAX_BATCH_DOC_LINES,
		diagnostics,
	});

	return { ok: diagnostics.length === 0, profile, diagnostics };
}
