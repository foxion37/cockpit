export type CockpitValidationProfile = "kr-batch";

export type CockpitValidationCode =
	| "cockpit_file_missing"
	| "forbidden_inline_html"
	| "forbidden_placeholder"
	| "empty_checkbox"
	| "required_section_missing"
	| "mermaid_block_missing"
	| "mermaid_classdef_missing"
	| "batch_link_missing"
	| "batch_link_unresolved"
	| "cockpit_too_long"
	| "progress_bar_missing"
	| "progress_alignment_delimiter"
	| "progress_bar_not_left_aligned"
	| "progress_percentage_missing"
	| "batch_doc_forbidden_inline_html"
	| "batch_doc_forbidden_placeholder"
	| "batch_doc_empty_checkbox"
	| "batch_doc_missing_content"
	| "batch_doc_too_long";

export interface CockpitValidationOptions {
	readonly repoRoot: string;
	readonly profile?: CockpitValidationProfile;
	readonly cockpitPath?: string;
	readonly maxCockpitLines?: number;
	readonly maxBatchDocLines?: number;
}

export interface CockpitValidationDiagnostic {
	readonly code: CockpitValidationCode;
	readonly severity: "error";
	readonly filePath: string;
	readonly message: string;
	readonly lineNumber?: number;
	readonly detail?: string;
}

export interface CockpitValidationResult {
	readonly ok: boolean;
	readonly profile: CockpitValidationProfile;
	readonly diagnostics: readonly CockpitValidationDiagnostic[];
}

export interface DiagnosticInput {
	readonly code: CockpitValidationCode;
	readonly filePath: string;
	readonly message: string;
	readonly lineNumber?: number | undefined;
	readonly detail?: string | undefined;
}
