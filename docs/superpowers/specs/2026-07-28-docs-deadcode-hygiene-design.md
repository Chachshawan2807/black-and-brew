# Design: Docs + Proven Dead-Code Hygiene (Scope B)

> Date: 2026-07-28 | Status: Approved | Approach: 2

## Goal

Bring project-owned documentation and proven-unused code references in line with the current repo — fact-based, no knip-wide purge, no migration history rewrites.

## Scope

### In

1. Docs keepers: `README.md`, `PROJECT_MAP.md`, `docs/*` (not `.agents/skills/`), `sql/README.md`, `sql/historical/README.md`, root `MASTER_BLUEPRINT.md` stub
2. Fact sync: routes/actions/migrations on disk
3. Branch reality notes: view-transition helpers, `RoundedSelect`, schedule clear-all removed, frequent-items cache, deferred TrackingMore in `shipBeanOrder`
4. Proven dead code: e.g. `trackingWarning` return type/clients after action no longer returns it; doc refs to deleted files
5. Validate relative paths in project-owned docs
6. `docs/changelog.md` + stamp bump to 2026-07-28 (keep product v9.3)

### Out

- Do not delete/squash applied `supabase/migrations/*`
- Do not edit third-party `.agents/skills/` or `.agent-skills/vendor/`
- No full-repo knip/ts-prune purge (scope C)
- Keep completed `docs/superpowers/specs|plans/*` as history; fix only broken paths if found
- `.codex/hooks.json` graphify: optional no-op cleanup only if clearly misleading

## Success criteria

- No project-owned doc path points at a missing file
- `PROJECT_MAP` / `sql/README` / `database.md` match disk
- Dead `trackingWarning` surface removed from action + clients
- Changelog entry for this pass

## Spec self-review

- No placeholders; scope matches user-approved Approach 2
- Does not contradict migration immutability rule
- Superpowers archives retained
