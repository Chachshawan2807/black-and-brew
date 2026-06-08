# MASTER BLUEPRINT — BLACKANDBREW ERP

> **Canonical document:** [docs/MASTER_BLUEPRINT.md](docs/MASTER_BLUEPRINT.md)
> **Last Updated:** 2026-06-09

This root file is a redirect stub only. The full Master Blueprint lives in [`docs/MASTER_BLUEPRINT.md`](docs/MASTER_BLUEPRINT.md).

## Summary

BLACKANDBREW ERP is a Next.js 16 + Supabase system for staff scheduling, maintenance tracking, and smart inventory. Core standards include Pastel Frictionless UI, Zero-Bold Policy, and strict BKK (GMT+7) timezone enforcement.

## Deprecated (removed from codebase)

- `src/lib/agent-tools/` — deleted; AI tools now live in `src/app/actions/tools/` (`readTableTool`, `getDailyShiftsTool`, `internetSearchTool`; cron-only: `weatherTool`, `getDailyReportSourcesTool` in `internal-sources-tools.ts`).
- Env vars not referenced in `src/`: `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `LINE_CHANNEL_ID`, `READ_ONLY_PIN`. Use `GOOGLE_GENERATIVE_AI_API_KEY` for Gemini (`@ai-sdk/google`).

For architecture, UI/UX standards, interaction patterns, deployment prerequisites, and environment variables, see the [canonical blueprint](docs/MASTER_BLUEPRINT.md).
