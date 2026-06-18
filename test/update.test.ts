import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";

import { COCKPIT_FILE_NAMES } from "../src/types.js";
import { updateCockpit } from "../src/update.js";

describe("cockpit update", () => {
	it("creates exactly the default four cockpit output files", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-default-contract-"));

		const result = await updateCockpit(repo);
		const cockpitEntries = await readdir(join(repo, ".cockpit"), {
			withFileTypes: true,
		});
		const cockpitFiles = cockpitEntries
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name)
			.sort();
		const expectedFiles = [...COCKPIT_FILE_NAMES].sort();

		expect(result.files.map((file) => basename(file)).sort()).toEqual(
			expectedFiles,
		);
		expect(cockpitFiles).toEqual(expectedFiles);
	});

	it("writes exactly the four primary cockpit markdown files", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-update-"));
		await mkdir(join(repo, ".cockpit", "plans"), { recursive: true });
		await writeFile(
			join(repo, ".cockpit", "plans", "demo.md"),
			"## TODOs\n- [x] Batch 1\n- [ ] Batch 2\n",
			"utf8",
		);
		await writeFile(
			join(repo, ".cockpit", "state.json"),
			JSON.stringify({
				schema_version: 2,
				active_work_id: "w1",
				works: {
					w1: {
						work_id: "w1",
						active_plan: ".cockpit/plans/demo.md",
						plan_name: "demo",
						status: "active",
						session_ids: ["codex:qa"],
					},
				},
			}),
			"utf8",
		);

		const result = await updateCockpit(repo);
		const files = (await readdir(join(repo, ".cockpit")))
			.filter((file) => file.endsWith(".md"))
			.sort();

		expect(result.files.map((file) => basename(file)).sort()).toEqual(files);
		expect(files).toEqual([
			"AGENT_GUARDRAILS.md",
			"ARCHITECTURE.md",
			"STATUS_KR.md",
			"WORKPLAN.md",
		]);
	});
});
