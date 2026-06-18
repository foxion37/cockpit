import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
	addInlineHtmlDiagnostics,
	addPlaceholderDiagnostics,
	diagnostic,
	relativePath,
} from "./common.js";
import type { CockpitValidationDiagnostic } from "./types.js";

export async function validateBatchDocs(
	repoRoot: string,
	context: {
		readonly maxLines: number;
		readonly diagnostics: CockpitValidationDiagnostic[];
	},
): Promise<void> {
	const batchDir = resolve(repoRoot, "docs", "batches");
	let entries: string[];
	try {
		entries = await readdir(batchDir);
	} catch {
		return;
	}

	for (const entry of entries.sort()) {
		if (!entry.endsWith(".md")) continue;
		await validateBatchDoc(resolve(batchDir, entry), entry, repoRoot, context);
	}
}

async function validateBatchDoc(
	path: string,
	entry: string,
	repoRoot: string,
	context: {
		readonly maxLines: number;
		readonly diagnostics: CockpitValidationDiagnostic[];
	},
): Promise<void> {
	const text = await readFile(path, "utf8");
	const lines = text.split(/\r?\n/u);
	const filePath = relativePath(repoRoot, path);

	addInlineHtmlDiagnostics(
		text,
		lines,
		filePath,
		context.diagnostics,
		"batch_doc_forbidden_inline_html",
	);
	addPlaceholderDiagnostics(
		text,
		lines,
		filePath,
		context.diagnostics,
		"batch_doc_forbidden_placeholder",
		"batch_doc_empty_checkbox",
	);

	if (entry !== "README.md" && !hasBatchDetailContent(text)) {
		context.diagnostics.push(
			diagnostic({
				code: "batch_doc_missing_content",
				filePath,
				message:
					"Batch detail docs should show goal, progress, and check content.",
			}),
		);
	}

	if (lines.length > context.maxLines) {
		context.diagnostics.push(
			diagnostic({
				code: "batch_doc_too_long",
				filePath,
				message: `Batch detail doc should stay concise; found ${lines.length} lines.`,
				detail: `${lines.length}/${context.maxLines}`,
			}),
		);
	}
}

function hasBatchDetailContent(text: string): boolean {
	return /##/u.test(text) && /진행률/u.test(text) && /확인/u.test(text);
}
