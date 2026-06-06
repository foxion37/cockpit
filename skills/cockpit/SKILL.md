---
name: cockpit
description: Maintain the slim Cockpit four-file status surface.
metadata:
  short-description: Slim four-file Cockpit updater
---

# cockpit

Use this skill when the user asks for Cockpit, cockpit status, a slim work dashboard, or an auto-updated progress surface.

## Contract

The primary Cockpit surface is exactly four Markdown files under `.omo/cockpit/`:

- `WORKPLAN.md` - overall progress, active plan, phases, detailed batches, batch progress, current task, and blockers.
- `ARCHITECTURE.md` - architecture diagram plus local graph-source status for CodeGraph, codebase-memory-mcp, and Understand-Anything.
- `STATUS_KR.md` - Korean progress summary in `/cavexplain` style: short sections such as `결론`, `근거`, `리스크`, and `다음`.
- `AGENT_GUARDRAILS.md` - concise agent-facing guardrails, source-of-truth files, and mutation boundaries.

Do not create extra primary Cockpit docs unless the user explicitly asks for a new file. Legacy Cockpit files are deprecated and read-only by default unless a project maps them explicitly.

## Workflow

1. Read existing durable state first: `.omo/boulder.json`, `.omo/plans/`, `.omo/start-work/`, and `.omo/ulw-loop/`.
2. Run the updater when current state should be refreshed:
   ```sh
   node "${PLUGIN_ROOT}/components/cockpit/dist/cli.js" cockpit update --repo-root "$PWD" --json
   ```
3. Treat missing optional graph sources as degraded architecture status, not failure.
4. Keep `STATUS_KR.md` for the user-facing Korean summary and `AGENT_GUARDRAILS.md` for other agents. Do not blend those audiences.

## Hook Behavior

Cockpit hooks are best-effort:

- `UserPromptSubmit` activates only for OMO/skill/cockpit prompts.
- `Stop` and `SubagentStop` refresh `.omo/cockpit` after work completes.
- Hook failures return empty output and must not block `start-work` continuation or other hook decisions.

## Guardrails

- Source of truth stays outside Cockpit output. Do not infer state from old Cockpit files.
- Preserve user-authored legacy files unless the user requests a migration.
- No normal-update network calls to GitHub or external graph services.
- Prefer deterministic Markdown output so agents can diff changes cleanly.
