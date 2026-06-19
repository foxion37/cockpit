#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { stdin as input, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { CockpitHookStrictError, runCockpitHook } from "./hooks.js";
import { COCKPIT_PROFILES } from "./types.js";
import { updateCockpit } from "./update.js";
import { validateCockpit } from "./validate.js";
const HELP = "Usage:\n  cockpit update [--repo-root <path>] [--profile kr-batch] [--json]\n  cockpit validate [--repo-root <path>] --profile kr-batch [--json]\n  cockpit cockpit update [--repo-root <path>] [--profile kr-batch] [--json]\n  cockpit cockpit validate [--repo-root <path>] --profile kr-batch [--json]\n  cockpit hook user-prompt-submit|stop|subagent-stop\n";
export async function cockpitCommand(argv) {
    const command = argv[0] ?? "help";
    if (command === "help" || command === "--help" || command === "-h") {
        stdout.write(HELP);
        return 0;
    }
    if (command === "update" || command === "validate")
        return cockpitSubcommand(argv);
    if (command === "cockpit")
        return cockpitSubcommand(argv.slice(1));
    if (command === "hook")
        return hookSubcommand(argv.slice(1));
    stderr.write(`[cockpit] unknown command: ${command}\n${HELP}`);
    return 1;
}
async function cockpitSubcommand(argv) {
    const command = argv[0];
    if (command !== "update" && command !== "validate") {
        stderr.write(`[cockpit] unknown cockpit subcommand: ${command ?? "(none)"}\n${HELP}`);
        return 1;
    }
    const repoRoot = readValue(argv, "--repo-root") ?? process.cwd();
    const parsedProfile = readProfile(argv);
    if (!parsedProfile.ok) {
        stderr.write(`[cockpit] ${parsedProfile.message}\n${HELP}`);
        return 1;
    }
    if (command === "update") {
        const result = parsedProfile.profile === undefined
            ? await updateCockpit(repoRoot)
            : await updateCockpit(repoRoot, { profile: parsedProfile.profile });
        if (hasFlag(argv, "--json"))
            stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
        else
            stdout.write(`cockpit updated: ${result.files.length} file(s)\n`);
        return 0;
    }
    const profile = parsedProfile.profile ?? "kr-batch";
    if (profile !== "kr-batch") {
        stderr.write(`[cockpit] profile ${profile} does not support validation; use kr-batch\n${HELP}`);
        return 1;
    }
    const result = await validateCockpit({ repoRoot, profile });
    if (hasFlag(argv, "--json"))
        stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else if (result.ok)
        stdout.write("cockpit validation ok\n");
    else
        stdout.write(`cockpit validation failed: ${result.diagnostics.length} issue(s)\n`);
    return result.ok ? 0 : 1;
}
async function hookSubcommand(argv) {
    const event = argv[0];
    if (event !== "user-prompt-submit" &&
        event !== "stop" &&
        event !== "subagent-stop") {
        stderr.write(`[cockpit] unknown hook subcommand: ${event ?? "(none)"}\n${HELP}`);
        return 1;
    }
    const raw = await readStdin();
    const parsed = parseHookPayload(raw);
    if (parsed === null)
        return 0;
    try {
        stdout.write(await runCockpitHook(parsed, {
            strict: isStrictEnabled(process.env["COCKPIT_STRICT"]),
        }));
    }
    catch (error) {
        if (error instanceof CockpitHookStrictError) {
            stdout.write(`${JSON.stringify(error.result, null, 2)}\n`);
            return 1;
        }
        throw error;
    }
    return 0;
}
export function parseHookPayload(raw) {
    if (raw.trim() === "")
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function readValue(argv, flag) {
    const index = argv.indexOf(flag);
    if (index === -1)
        return undefined;
    return argv[index + 1];
}
function readProfile(argv) {
    if (!argv.includes("--profile"))
        return { ok: true };
    const profile = readValue(argv, "--profile");
    if (profile === undefined || profile.startsWith("--")) {
        return { ok: false, message: "missing value for --profile" };
    }
    if (!isCockpitProfile(profile)) {
        return {
            ok: false,
            message: `unknown profile: ${profile}`,
        };
    }
    return { ok: true, profile };
}
function isCockpitProfile(value) {
    return COCKPIT_PROFILES.includes(value);
}
function hasFlag(argv, flag) {
    return argv.includes(flag);
}
function isStrictEnabled(value) {
    return value === "1" || value === "true" || value === "yes";
}
async function readStdin() {
    const chunks = [];
    for await (const chunk of input)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    return Buffer.concat(chunks).toString("utf8");
}
export function isCliEntry(importMetaUrl, argvPath) {
    if (argvPath === undefined)
        return false;
    try {
        return (realpathSync(fileURLToPath(importMetaUrl)) ===
            realpathSync(resolve(argvPath)));
    }
    catch {
        return false;
    }
}
if (isCliEntry(import.meta.url, process.argv[1])) {
    cockpitCommand(process.argv.slice(2))
        .then((code) => {
        process.exit(code);
    })
        .catch((error) => {
        stderr.write(`[cockpit] ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    });
}
