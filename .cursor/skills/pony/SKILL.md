---
name: pony
description: >
  Cleans BLACKANDBREW ERP source for dead code, unused imports, and local
  duplication while behavior, UI, and copy stay identical. Use when the user
  invokes /pony, asks for a cleanliness refactor, dead-code cleanup, or
  says the app must still work and look the same.
disable-model-invocation: true
---

# Pony

ช่วย โดยที่ยังทำงานและแสดงผลได้เหมือนเดิม

Cleanliness only. The running app, screens, copy, and data must match the pre-change build. A shorter diff that preserves behavior beats a broader rewrite.

## Invariants

- Do not change what the user sees: layout, pastel colors, theme tokens, Thai copy, empty states, loading, errors.
- Do not change control flow, Supabase queries, Server Action auth, notification hub sync, or numeric sanitize/undo rules.
- Do not rename public exports, routes, CSS classes, storage keys, or RPC names.
- Do not move files, split modules, or "deepen" architecture in the same pass.
- No em dash (U+2014). No new `features/` or `services/` folders.

If a cleanup needs any of the above, stop and leave the code as it is.

## Allowed edits

- Remove an import, binding, or file only after a search shows zero uses (including tests, `public/sw.js`, and dynamic `import()`).
- Delete a duplicate helper only when every caller already has one implementation and tests still cover the path.
- Collapse an obvious local no-op (unused variable the typechecker or linter flags) without changing the surrounding call.

## Forbidden edits

- Formatting-only sweeps across untouched files.
- Reordering imports, JSX, or object keys "for style".
- Swapping equivalent APIs (`useMemo` vs derived, `&&` vs ternary) unless a linter error requires it.
- Editing vendored trees: `.agents/`, `.cursor/` (except this skill), `.agent-skills/`, `node_modules/`.

## Order

1. Run `npm run scan:orphans`. Treat every hit as a candidate, not a deletion. The scanner misses relative imports.
2. For each candidate, search the repo for the file path, the export names, and any string of the module. Keep the file if anything references it, including a route entry (`page`, `layout`, `route`, `loading`, `error`).
3. Delete only confirmed orphans. Fix imports that break.
4. Run `npm run lint` and `npm run typecheck`. Fix only errors this pass introduced.
5. Run the tests for the domain you touched (`npm run test:notifications` if any notification file changed).
6. Do not claim the UI is unchanged unless you loaded the affected route, or you state that no UI file changed so browser check was skipped.

## Stop conditions

- The orphan list is empty or every hit is referenced: report that and do not invent churn.
- A delete would touch `src/app/actions/`, `src/hooks/use-inventory-notifications.ts`, or `supabase/migrations/`: confirm the symbol is unused in SQL, cron, and clients before removing it. Prefer leaving it.
- Lint or typecheck fails for a reason outside the deleted symbol: revert that file.
