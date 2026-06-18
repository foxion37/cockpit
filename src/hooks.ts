import { updateCockpit } from "./update.js";
import { type CockpitValidationResult, validateCockpit } from "./validate.js";

type HookEventName = "UserPromptSubmit" | "Stop" | "SubagentStop";

interface HookInput {
	readonly hookEventName: HookEventName;
	readonly cwd: string;
	readonly prompt: string | null;
}

export interface CockpitHookOptions {
	readonly strict?: boolean;
}

export class CockpitHookStrictError extends Error {
	readonly result: CockpitValidationResult;

	constructor(result: CockpitValidationResult) {
		super(`cockpit validation failed: ${result.diagnostics.length} issue(s)`);
		this.name = "CockpitHookStrictError";
		this.result = result;
	}
}

const SKILL_MARKER_PATTERN =
	/(?:\[\$cockpit\b|\$ulw-loop\b|\$start-work\b|\$cockpit\b|\/cavexplain\b)/u;

export async function runCockpitHook(
	input: unknown,
	options: CockpitHookOptions = {},
): Promise<string> {
	const hookInput = parseHookInput(input);
	if (hookInput === null) return "";
	if (!shouldUpdate(hookInput)) return "";
	try {
		await updateCockpit(hookInput.cwd);
	} catch {
		if (options.strict === true) throw new Error("cockpit update failed");
		return "";
	}
	if (options.strict === true) {
		const result = await validateCockpit({
			repoRoot: hookInput.cwd,
			profile: "kr-batch",
		});
		if (!result.ok) throw new CockpitHookStrictError(result);
	}
	return "";
}

function shouldUpdate(input: HookInput): boolean {
	if (input.hookEventName === "Stop" || input.hookEventName === "SubagentStop")
		return true;
	return input.prompt !== null && SKILL_MARKER_PATTERN.test(input.prompt);
}

function parseHookInput(value: unknown): HookInput | null {
	if (!isHookInputRecord(value)) return null;
	const eventName = value.hook_event_name;
	const cwd = value.cwd;
	const prompt = value.prompt;
	if (!isHookEventName(eventName) || typeof cwd !== "string") return null;
	return {
		hookEventName: eventName,
		cwd,
		prompt: typeof prompt === "string" ? prompt : null,
	};
}

function isHookEventName(value: unknown): value is HookEventName {
	return (
		value === "UserPromptSubmit" || value === "Stop" || value === "SubagentStop"
	);
}

function isHookInputRecord(value: unknown): value is {
	readonly hook_event_name?: unknown;
	readonly cwd?: unknown;
	readonly prompt?: unknown;
} {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
