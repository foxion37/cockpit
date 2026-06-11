import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { isCliEntry } from "../src/cli.js";

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
