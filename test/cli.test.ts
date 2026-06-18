import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cockpitCommand, isCliEntry, parseHookPayload } from "../src/cli.js";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("cockpit cli entry detection", () => {
	it("matches entrypoint paths that contain spaces", async () => {
		const root = await mkdtemp(join(tmpdir(), "Cockpit 2 "));
		const argvPath = join(root, "dist", "cli.js");
		await mkdir(join(root, "dist"), { recursive: true });
		await writeFile(argvPath, "", "utf8");

		expect(isCliEntry(pathToFileURL(argvPath).href, argvPath)).toBe(true);
	});

	it("matches relative entrypoint paths", () => {
		const argvPath = join("src", "cli.ts");
		const absolutePath = join(process.cwd(), argvPath);

		expect(isCliEntry(pathToFileURL(absolutePath).href, argvPath)).toBe(true);
	});

	it("matches package bin symlinks", async () => {
		const root = await mkdtemp(join(tmpdir(), "cockpit-bin-"));
		const target = join(root, "dist", "cli.js");
		const link = join(root, "node_modules", ".bin", "cockpit");
		await mkdir(join(root, "dist"), { recursive: true });
		await mkdir(join(root, "node_modules", ".bin"), { recursive: true });
		await writeFile(target, "", "utf8");
		await symlink(target, link);

		expect(isCliEntry(pathToFileURL(target).href, link)).toBe(true);
	});
});

describe("cockpit hook payload parsing", () => {
	it("treats malformed hook stdin as a best-effort no-op", () => {
		expect(parseHookPayload("")).toEqual({});
		expect(parseHookPayload("{not-json")).toBeNull();
	});
});

describe("cockpit cli commands", () => {
	it("documents profile update and validate commands in help", async () => {
		const result = await runCli(["--help"]);

		expect(result.code).toBe(0);
		expect(result.stdout).toContain("cockpit update");
		expect(result.stdout).toContain("--profile kr-batch");
		expect(result.stdout).toContain("cockpit validate");
	});

	it("keeps default update on the legacy four-file .cockpit contract", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-cli-default-"));

		try {
			const result = await runCli([
				"cockpit",
				"update",
				"--repo-root",
				repo,
				"--json",
			]);
			const payload = JSON.parse(result.stdout);
			const files = await readdir(join(repo, ".cockpit"));

			expect(result.code).toBe(0);
			expect(payload.ok).toBe(true);
			expect(files.filter((file) => file.endsWith(".md")).sort()).toEqual([
				"AGENT_GUARDRAILS.md",
				"ARCHITECTURE.md",
				"STATUS_KR.md",
				"WORKPLAN.md",
			]);
		} finally {
			await rm(repo, { force: true, recursive: true });
		}
	});

	it("writes and validates kr-batch output through the CLI", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-cli-kr-"));

		try {
			const updateResult = await runCli([
				"update",
				"--repo-root",
				repo,
				"--profile",
				"kr-batch",
				"--json",
			]);
			const updatePayload = JSON.parse(updateResult.stdout);
			const cockpit = await readFile(join(repo, "COCKPIT_KR.md"), "utf8");

			expect(updateResult.code).toBe(0);
			expect(updatePayload.ok).toBe(true);
			expect(updatePayload.files).toEqual(
				expect.arrayContaining([
					join(repo, "COCKPIT_KR.md"),
					join(repo, "docs", "batches", "README.md"),
					join(repo, "docs", "batches", "current-batch.md"),
				]),
			);
			expect(cockpit).toContain("## 2. 배치 구분과 배치별 진행률");

			const validateResult = await runCli([
				"cockpit",
				"validate",
				"--repo-root",
				repo,
				"--profile",
				"kr-batch",
				"--json",
			]);
			const validatePayload = JSON.parse(validateResult.stdout);

			expect(validateResult.code).toBe(0);
			expect(validatePayload).toMatchObject({
				ok: true,
				profile: "kr-batch",
				diagnostics: [],
			});
		} finally {
			await rm(repo, { force: true, recursive: true });
		}
	});

	it("returns nonzero validation status for corrupted kr-batch output", async () => {
		const repo = await mkdtemp(join(tmpdir(), "cockpit-cli-invalid-"));

		try {
			await runCli(["update", "--repo-root", repo, "--profile", "kr-batch"]);
			await writeFile(
				join(repo, "COCKPIT_KR.md"),
				'<span style="color:red">broken</span>\n',
				"utf8",
			);

			const result = await runCli([
				"validate",
				"--repo-root",
				repo,
				"--profile",
				"kr-batch",
				"--json",
			]);
			const payload = JSON.parse(result.stdout);

			expect(result.code).toBe(1);
			expect(payload.ok).toBe(false);
			expect(
				payload.diagnostics.map((issue: { code: string }) => issue.code),
			).toContain("forbidden_inline_html");
		} finally {
			await rm(repo, { force: true, recursive: true });
		}
	});

	it("rejects unknown profiles visibly", async () => {
		const result = await runCli(["update", "--profile", "unknown"]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain("unknown profile");
	});
});

async function runCli(argv: readonly string[]): Promise<{
	readonly code: number;
	readonly stdout: string;
	readonly stderr: string;
}> {
	let stdoutText = "";
	let stderrText = "";
	vi.spyOn(process.stdout, "write").mockImplementation(
		(chunk: string | Uint8Array) => {
			stdoutText += Buffer.isBuffer(chunk)
				? chunk.toString("utf8")
				: String(chunk);
			return true;
		},
	);
	vi.spyOn(process.stderr, "write").mockImplementation(
		(chunk: string | Uint8Array) => {
			stderrText += Buffer.isBuffer(chunk)
				? chunk.toString("utf8")
				: String(chunk);
			return true;
		},
	);

	const code = await cockpitCommand(argv);
	return { code, stdout: stdoutText, stderr: stderrText };
}
