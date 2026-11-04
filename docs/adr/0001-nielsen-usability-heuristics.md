# ADR 0001: Nielsen 10 Usability Heuristics as UX baseline

- Status: Accepted
- Date: 2026-09-04

## Context

UX guidance lived in several AGENTS.md standards and design-review skills. Impeccable critique could score Nielsen heuristics, but implement work had no single MUST list.

## Decision

Adopt Jakob Nielsen’s 10 Usability Heuristics as the project-wide UX/UI IRON RULE in `AGENTS.md` (`nielsen-usability-heuristics-standard`), ranked below ERP domain rules and above chrome-modern-web-guidance.

ERP exceptions (notification view-only, spreadsheet inline cells, transaction ledger off UI undo) still win when they conflict.

User-facing errors use `src/lib/user-facing-error.ts`. Audit backlog: `docs/usability-heuristics-audit.md`.

## Consequences

UI diffs must pass the Nielsen pre-ship checklist. Design-review step 0 is heuristic pass/fail. Remaining Server Actions that return raw Supabase messages are tracked as P1 in the audit doc.
