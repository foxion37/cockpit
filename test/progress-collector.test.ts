import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { collectCockpitModel } from "../src/collect.js";

describe("cockpit progress collector", () => {
	it("summarizes active start-work progress", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-progress-"));
		await mkdir(join(repo, ".cockpit", "plans"), { recursive: true });
		await writeFile(
			join(repo, ".cockpit", "plans", "demo.md"),
			[
				"# Demo",
				"",
				"## TODOs",
				"- [x] Done",
				"- [ ] Build hook",
				"- [ ] Verify",
			].join("\n"),
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
						session_ids: ["codex:test"],
					},
				},
			}),
			"utf8",
		);

		const model = await collectCockpitModel(repo);

		expect(model.progress).toMatchObject({
			status: "in_progress",
			totalTasks: 3,
			completedTasks: 1,
			remainingTasks: 2,
			percentComplete: 33,
			currentTask: "Build hook",
			activePlanName: "demo",
		});
	});

	it("returns warnings instead of throwing for malformed cockpit state", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-malformed-"));
		await mkdir(join(repo, ".cockpit"), { recursive: true });
		await writeFile(join(repo, ".cockpit", "state.json"), "{not-json", "utf8");

		const model = await collectCockpitModel(repo);

		expect(model.progress.status).toBe("warning");
		expect(model.progress.warnings.join("\n")).toContain(".cockpit/state.json");
	});

	it("keeps legacy cockpit files untouched while reporting them", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-legacy-"));
		await writeFile(
			join(repo, "DOCS_CONTRACT.md"),
			"legacy contract\n",
			"utf8",
		);

		const model = await collectCockpitModel(repo);

		expect(model.legacyFilesDetected).toEqual(["DOCS_CONTRACT.md"]);
		expect(await readFile(join(repo, "DOCS_CONTRACT.md"), "utf8")).toBe(
			"legacy contract\n",
		);
	});

	it("does not report primary uppercase cockpit files as lowercase legacy files", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-legacy-case-"));
		await mkdir(join(repo, ".cockpit"), { recursive: true });
		await writeFile(
			join(repo, ".cockpit", "ARCHITECTURE.md"),
			"primary architecture\n",
			"utf8",
		);

		const model = await collectCockpitModel(repo);

		expect(model.legacyFilesDetected).not.toContain(".cockpit/architecture.md");
	});

	it("summarizes start-work and ulw-loop durable state sources", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-durable-sources-"));
		await mkdir(join(repo, ".cockpit", "start-work"), { recursive: true });
		await mkdir(join(repo, ".cockpit", "ulw-loop"), { recursive: true });
		await writeFile(
			join(repo, ".cockpit", "start-work", "ledger.jsonl"),
			'{"kind":"started"}\n{"kind":"checkpoint"}\n',
			"utf8",
		);
		await writeFile(
			join(repo, ".cockpit", "ulw-loop", "goals.json"),
			JSON.stringify({
				goals: [
					{
						status: "in_progress",
						successCriteria: [{ status: "pass" }, { status: "pending" }],
					},
				],
			}),
			"utf8",
		);
		await writeFile(
			join(repo, ".cockpit", "ulw-loop", "ledger.jsonl"),
			'{"kind":"plan_created"}\n',
			"utf8",
		);

		const model = await collectCockpitModel(repo);

		expect(model.stateSources).toEqual([
			{
				name: "start-work ledger",
				path: ".cockpit/start-work/ledger.jsonl",
				status: "available",
				summary: "2 event(s)",
			},
			{
				name: "ulw-loop goals",
				path: ".cockpit/ulw-loop/goals.json",
				status: "available",
				summary: "1 goal(s), 1/2 criterion pass",
			},
			{
				name: "ulw-loop ledger",
				path: ".cockpit/ulw-loop/ledger.jsonl",
				status: "available",
				summary: "1 event(s)",
			},
		]);
	});

	it("summarizes session-scoped ulw-loop state when top-level files are absent", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-session-ulw-"));
		await mkdir(join(repo, ".cockpit", "ulw-loop", "session-1"), {
			recursive: true,
		});
		await writeFile(
			join(repo, ".cockpit", "ulw-loop", "session-1", "goals.json"),
			JSON.stringify({
				goals: [
					{
						title: "Cockpit graphics",
						status: "pending",
						successCriteria: [
							{ id: "C001", status: "pass" },
							{ id: "C002", status: "pending" },
						],
					},
				],
			}),
			"utf8",
		);
		await writeFile(
			join(repo, ".cockpit", "ulw-loop", "session-1", "ledger.jsonl"),
			'{"kind":"plan_created"}\n{"kind":"evidence_captured"}\n',
			"utf8",
		);

		const model = await collectCockpitModel(repo);

		expect(model.progress).toMatchObject({
			status: "in_progress",
			totalTasks: 2,
			completedTasks: 1,
			remainingTasks: 1,
			percentComplete: 50,
			currentTask: "C002",
			activePlanName: "ulw-loop/session-1",
		});
		expect(model.stateSources).toEqual([
			{
				name: "start-work ledger",
				path: ".cockpit/start-work/ledger.jsonl",
				status: "missing",
				summary: "not present",
			},
			{
				name: "ulw-loop goals",
				path: ".cockpit/ulw-loop/session-1/goals.json",
				status: "available",
				summary: "1 goal(s), 1/2 criterion pass",
			},
			{
				name: "ulw-loop ledger",
				path: ".cockpit/ulw-loop/session-1/ledger.jsonl",
				status: "available",
				summary: "2 event(s)",
			},
		]);
	});
});
