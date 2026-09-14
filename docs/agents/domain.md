# Domain Docs

How Matt Pocock engineering skills (and all agents) should consume domain documentation in **BLACKANDBREW ERP**, aligned with **hub-first** fixes and **codebase-memory-mcp**.

## Exploration order (code changes)

This repo's iron rule (see `.cursorrules` and `AGENTS.md`) overrides generic "read the whole tree" exploration:

1. **Knowledge graph first:** `search_graph` → `trace_path` / `query_graph` on codebase-memory-mcp before broad grep/glob.
2. **Hub before UI:** locate domain hubs (e.g. notifications → `src/hooks/use-inventory-notifications.ts`) then expand to persistence, PWA, UI last.
3. **Edit through central layers:** mutations via `src/app/actions/`, logic in `src/lib/`, types in `src/types/index.ts`.
4. **After structural changes:** `index_repository` (full) → `get_architecture` (all) → `manage_adr(mode='store')` via MCP (not CLI-only `graph:sync` for ADR store).

Fallback to grep/glob only when the graph has no hits (strings, config, unindexed files).

## Before exploring, read these

| Source | Role |
| ------ | ---- |
| **`docs/context.md`** | Human-maintained project glossary, capabilities, and environment (canonical today). |
| **`CONTEXT.md`** (repo root) | Matt Pocock `/domain-modeling` glossary slot. Create or extend lazily when new terms are resolved; prefer merging into `docs/context.md` or linking both rather than duplicating. |
| **`docs/adr/`** | Markdown ADRs (`0001-slug.md`, …) when `/domain-modeling` records a decision. Directory may not exist until the first ADR. |
| **codebase-memory-mcp ADRs** | Architecture decisions synced from the graph (`manage_adr`). Treat as authoritative for **structure and dependencies**; flag conflicts with markdown ADRs explicitly. |
| **`AGENTS.md` domain standards** | Notification hub, spreadsheet UI, typography (no U+2014), data sync, project structure. |

If `CONTEXT.md` or `docs/adr/` do not exist yet, proceed silently. Do not block work to create empty scaffolding.

## Layout

**Single-context** (this repo):

```text
/
├── docs/context.md          ← primary human context (existing)
├── CONTEXT.md               ← optional; domain-modeling may add at root
├── docs/adr/                ← lazy; first ADR creates the folder
├── docs/agents/             ← issue tracker + this file
├── AGENTS.md                ← ERP rules + agent skills pointer
└── src/
    ├── app/actions/         ← mutations
    ├── app/[locale]/        ← routes + _components
    └── lib/                 ← domain logic (+ hubs)
```

Not a monorepo: no `CONTEXT-MAP.md` unless the repo structure changes materially.

## Domain hubs (examples)

Use the graph to find qualified names; these are fixed entry points when the topic matches:

| Topic | Hub |
| ----- | --- |
| In-app + OS notifications, badge, push | `src/hooks/use-inventory-notifications.ts` |
| Secretary / operational tasks | `src/lib/secretary/` + `secretary-actions.ts` |
| Inventory stock truth | `src/lib/inventory-stock.ts` + `inventory-actions.ts` |
| Schedule / shifts | `src/lib/schedule/` + `shift-actions.ts` |

See `AGENTS.md` (notification-hub-standard) for the full notification layer matrix.

## Use the glossary's vocabulary

When naming concepts in issues, specs, refactors, or tests, match terms in `docs/context.md` (and `CONTEXT.md` when present). Avoid synonyms the project does not use.

Gaps in the glossary signal either invented language (reconsider) or input for `/domain-modeling`.

## Flag ADR conflicts

If a proposal contradicts a markdown ADR in `docs/adr/` or a decision in codebase-memory-mcp, state it explicitly:

> _Contradicts ADR-0007 (…), but worth reopening because…_

After accepted architectural change, run the MCP sync sequence so the graph and stored ADRs stay current.

## Related docs

- Capabilities inventory: `docs/skills.md`
- Hard protocols: `docs/rules.md`
- MCP setup: `.cursor/mcp.json.example` → `.cursor/mcp.json`
