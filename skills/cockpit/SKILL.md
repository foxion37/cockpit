---
name: cockpit
description: Maintain the slim Cockpit four-file status surface.
metadata:
  short-description: Slim Cockpit updater with optional kr-batch mode
---

# cockpit

Use this skill when the user asks for Cockpit, cockpit status, a slim work dashboard, or an auto-updated progress surface.

## Contract

The primary Cockpit surface is exactly four Markdown files under `.cockpit/`:

- `WORKPLAN.md` - overall progress, active plan, phases, detailed batches, batch progress, current task, and blockers.
- `ARCHITECTURE.md` - architecture diagram plus local graph-source status for CodeGraph, codebase-memory-mcp, and Understand-Anything.
- `STATUS_KR.md` - Korean progress summary in `/cavexplain` style: short sections such as `결론`, `근거`, `리스크`, and `다음`.
- `AGENT_GUARDRAILS.md` - concise agent-facing guardrails, source-of-truth files, and mutation boundaries.

Do not create extra primary Cockpit docs in default mode unless the user explicitly asks for a new file. Legacy Cockpit files are deprecated and read-only by default unless a project maps them explicitly.

The optional `kr-batch` profile is different on purpose. It writes `COCKPIT_KR.md` plus batch detail files under `docs/batches/` for projects that need a short Korean status board and longer batch notes elsewhere. The default four-file `.cockpit/` surface remains the compatibility mode.

## Workflow

1. Read existing durable state first: `.cockpit/state.json`, `.cockpit/plans/`, `.cockpit/start-work/`, and `.cockpit/ulw-loop/`.
2. Run the updater when current state should be refreshed:
   ```sh
   node "${PLUGIN_ROOT}/components/cockpit/dist/cli.js" cockpit update --repo-root "$PWD" --json
   ```
3. Use `kr-batch` only when the repo wants the concise Korean batch style:
   ```sh
   node "${PLUGIN_ROOT}/components/cockpit/dist/cli.js" cockpit update --repo-root "$PWD" --profile kr-batch --json
   ```
4. Validate `kr-batch` before relying on it for a handoff:
   ```sh
   node "${PLUGIN_ROOT}/components/cockpit/dist/cli.js" cockpit validate --repo-root "$PWD" --profile kr-batch --json
   ```
5. Treat missing optional graph sources as degraded architecture status, not failure.
6. Keep `STATUS_KR.md` for the default user-facing Korean summary and `AGENT_GUARDRAILS.md` for other agents. In `kr-batch`, keep `COCKPIT_KR.md` short and put command logs, technical decisions, and batch detail records under `docs/batches/`.

## Hook Behavior

Cockpit hooks are best-effort:

- `UserPromptSubmit` activates only for Cockpit or skill-related prompts.
- `Stop` and `SubagentStop` refresh `.cockpit` after work completes.
- Hook failures return empty output and must not block `start-work` continuation or other hook decisions.

Strict validation is opt-in. Set `COCKPIT_STRICT=1` when a Stop hook should fail if the `kr-batch` cockpit has validation failures.

## Guardrails

- Source of truth stays outside Cockpit output. Do not infer state from old Cockpit files.
- Preserve user-authored legacy files unless the user requests a migration.
- No normal-update network calls to GitHub or external graph services.
- Prefer deterministic Markdown output so agents can diff changes cleanly.
- `kr-batch` color must use Mermaid `classDef` rules. Do not use inline HTML style or span tags for app-visible color.
- Validation failures should be surfaced with `cockpit validate --profile kr-batch`; do not describe a broken Cockpit as ready.
