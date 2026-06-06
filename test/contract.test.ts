import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cockpitDir, cockpitFilePath } from "../src/paths.js";
import { COCKPIT_DIR, COCKPIT_FILE_NAMES } from "../src/types.js";

describe("cockpit four-file contract", () => {
	it("exposes exactly the four primary cockpit files", () => {
		expect(COCKPIT_FILE_NAMES).toEqual([
			"WORKPLAN.md",
			"ARCHITECTURE.md",
			"STATUS_KR.md",
			"AGENT_GUARDRAILS.md",
		]);
	});

	it("resolves cockpit paths under the repo root", () => {
		const repoRoot = "/tmp/project";
		expect(COCKPIT_DIR).toBe(".omo/cockpit");
		expect(cockpitDir(repoRoot)).toBe(join(repoRoot, ".omo", "cockpit"));
		expect(cockpitFilePath(repoRoot, "STATUS_KR.md")).toBe(
			join(repoRoot, ".omo", "cockpit", "STATUS_KR.md"),
		);
	});
});
