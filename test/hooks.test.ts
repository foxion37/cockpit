import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runCockpitHook } from "../src/hooks.js";

describe("cockpit hooks", () => {
	it("updates best-effort on Stop and returns empty output", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-stop-"));
		const output = await runCockpitHook({
			hook_event_name: "Stop",
			session_id: "sess",
			turn_id: "turn",
			transcript_path: "",
			cwd: repo,
			model: "gpt-5.5",
			permission_mode: "default",
			stop_hook_active: false,
		});

		expect(output).toBe("");
		expect(
			(await readdir(join(repo, ".omo", "cockpit")))
				.filter((file) => file.endsWith(".md"))
				.sort(),
		).toEqual([
			"AGENT_GUARDRAILS.md",
			"ARCHITECTURE.md",
			"STATUS_KR.md",
			"WORKPLAN.md",
		]);
	});

	it("updates on skill prompt markers", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-prompt-"));
		const output = await runCockpitHook({
			hook_event_name: "UserPromptSubmit",
			session_id: "sess",
			turn_id: "turn",
			transcript_path: "",
			cwd: repo,
			model: "gpt-5.5",
			permission_mode: "default",
			prompt: "[$omo:ulw-loop] 진행",
		});

		expect(output).toBe("");
		expect(await readdir(join(repo, ".omo", "cockpit"))).toContain(
			"STATUS_KR.md",
		);
	});
});
