import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { updateCockpit } from "../src/update.js";

describe("cockpit legacy migration behavior", () => {
	it("detects legacy files without modifying them", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-legacy-update-"));
		const legacyPath = join(repo, "DOCS_CONTRACT.md");
		await writeFile(legacyPath, "legacy contract\n", "utf8");
		const before = await stat(legacyPath);

		const result = await updateCockpit(repo);

		expect(result.legacyFilesDetected).toEqual(["DOCS_CONTRACT.md"]);
		expect(await readFile(legacyPath, "utf8")).toBe("legacy contract\n");
		expect((await stat(legacyPath)).mtimeMs).toBe(before.mtimeMs);
	});

	it("detects legacy files inside the cockpit directory without modifying them", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-legacy-dir-update-"));
		const legacyPath = join(repo, ".omo", "cockpit", "DOCS_CONTRACT.md");
		await mkdir(join(repo, ".omo", "cockpit"), { recursive: true });
		await writeFile(legacyPath, "legacy contract\n", "utf8");
		const before = await stat(legacyPath);

		const result = await updateCockpit(repo);

		expect(result.legacyFilesDetected).toEqual([
			".omo/cockpit/DOCS_CONTRACT.md",
		]);
		expect(await readFile(legacyPath, "utf8")).toBe("legacy contract\n");
		expect((await stat(legacyPath)).mtimeMs).toBe(before.mtimeMs);
	});

	it("renders the no-extra-docs guardrail", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-guardrail-update-"));

		await updateCockpit(repo);

		const guardrails = await readFile(
			join(repo, ".omo", "cockpit", "AGENT_GUARDRAILS.md"),
			"utf8",
		);
		expect(guardrails).toContain("Do not create extra planning/status docs");
		expect(guardrails).toContain(".omo/cockpit/WORKPLAN.md");
		expect(guardrails).toContain(".omo/cockpit/STATUS_KR.md");
	});
});
