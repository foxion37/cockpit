import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CockpitHookStrictError, runCockpitHook } from "../src/hooks.js";

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
			(await readdir(join(repo, ".cockpit")))
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
			prompt: "[$cockpit] 진행",
		});

		expect(output).toBe("");
		expect(await readdir(join(repo, ".cockpit"))).toContain("STATUS_KR.md");
	});

	it("keeps default Stop hooks best-effort when kr-batch validation would fail", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-default-invalid-"));
		await writeFile(
			join(repo, "COCKPIT_KR.md"),
			'<span style="color:red">broken</span>\n',
			"utf8",
		);

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
	});

	it("fails strict Stop hooks with structured kr-batch diagnostics", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-strict-invalid-"));
		await writeFile(
			join(repo, "COCKPIT_KR.md"),
			'<span style="color:red">broken</span>\n',
			"utf8",
		);

		await expect(
			runCockpitHook(
				{
					hook_event_name: "Stop",
					session_id: "sess",
					turn_id: "turn",
					transcript_path: "",
					cwd: repo,
					model: "gpt-5.5",
					permission_mode: "default",
					stop_hook_active: false,
				},
				{ strict: true },
			),
		).rejects.toMatchObject({
			name: CockpitHookStrictError.name,
			result: {
				ok: false,
				profile: "kr-batch",
				diagnostics: expect.arrayContaining([
					expect.objectContaining({ code: "forbidden_inline_html" }),
				]),
			},
		});
	});
});
