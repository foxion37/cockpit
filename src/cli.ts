#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { stdin as input, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import { runCockpitHook } from "./hooks.js";
import { updateCockpit } from "./update.js";

const HELP =
	"Usage:\n  cockpit update [--repo-root <path>] [--json]\n  cockpit cockpit update [--repo-root <path>] [--json]\n  cockpit hook user-prompt-submit|stop|subagent-stop\n";

export async function cockpitCommand(argv: readonly string[]): Promise<number> {
	const command = argv[0] ?? "help";
	if (command === "help" || command === "--help" || command === "-h") {
		stdout.write(HELP);
		return 0;
	}
	if (command === "update") return cockpitSubcommand(argv);
	if (command === "cockpit") return cockpitSubcommand(argv.slice(1));
	if (command === "hook") return hookSubcommand(argv.slice(1));
	stderr.write(`[cockpit] unknown command: ${command}\n${HELP}`);
	return 1;
}

async function cockpitSubcommand(argv: readonly string[]): Promise<number> {
	const command = argv[0];
	if (command !== "update") {
		stderr.write(
			`[cockpit] unknown cockpit subcommand: ${command ?? "(none)"}\n${HELP}`,
		);
		return 1;
	}
	const repoRoot = readValue(argv, "--repo-root") ?? process.cwd();
	const result = await updateCockpit(repoRoot);
	if (hasFlag(argv, "--json"))
		stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
	else stdout.write(`cockpit updated: ${result.files.length} file(s)\n`);
	return 0;
}

async function hookSubcommand(argv: readonly string[]): Promise<number> {
	const event = argv[0];
	if (
		event !== "user-prompt-submit" &&
		event !== "stop" &&
		event !== "subagent-stop"
	) {
		stderr.write(
			`[cockpit] unknown hook subcommand: ${event ?? "(none)"}\n${HELP}`,
		);
		return 1;
	}
	const raw = await readStdin();
	const parsed = parseHookPayload(raw);
	if (parsed === null) return 0;
	stdout.write(await runCockpitHook(parsed));
	return 0;
}

export function parseHookPayload(raw: string): unknown | null {
	if (raw.trim() === "") return {};
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function readValue(argv: readonly string[], flag: string): string | undefined {
	const index = argv.indexOf(flag);
	if (index === -1) return undefined;
	return argv[index + 1];
}

function hasFlag(argv: readonly string[], flag: string): boolean {
	return argv.includes(flag);
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of input)
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
	return Buffer.concat(chunks).toString("utf8");
}

export function isCliEntry(
	importMetaUrl: string,
	argvPath: string | undefined,
): boolean {
	if (argvPath === undefined) return false;
	try {
		return (
			realpathSync(fileURLToPath(importMetaUrl)) ===
			realpathSync(resolve(argvPath))
		);
	} catch {
		return false;
	}
}

if (isCliEntry(import.meta.url, process.argv[1])) {
	cockpitCommand(process.argv.slice(2))
		.then((code) => {
			process.exit(code);
		})
		.catch((error: unknown) => {
			stderr.write(
				`[cockpit] ${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exit(1);
		});
}
