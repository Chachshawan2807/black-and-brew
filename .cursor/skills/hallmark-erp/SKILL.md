---
name: hallmark-erp
description: |
  BLACKANDBREW ERP overlay for Hallmark — supplementary anti-AI-slop review only.
  Use when the user asks for hallmark audit, hallmark study, anti-slop review, or
  generic-design checks. NEVER use to build or redesign core ERP UI.

  MANDATORY: read this file before `.agents/skills/hallmark/SKILL.md` in this repo.
---

# Hallmark — BLACKANDBREW ERP (supplementary only)

Hallmark is installed at `.agents/skills/hallmark/` but **does not drive ERP UI** in this project.

## Rule priority

When Hallmark conflicts with anything in `AGENTS.md`, **ERP rules win**:

1. ERP domain rules (spreadsheet grids, pastel shift colors, theme tokens, data symmetry)
2. `chrome-modern-web-guidance` + `modern-web-guidance`
3. React & Next.js skills
4. `web-design-guidelines`, `impeccable` (`critique` only), `ui-ux-pro-max`
5. **Hallmark** — audit / study only (this overlay)

Reject Hallmark output that suggests: modals for grid edits, decorative marketing layouts, non-pastel surfaces, new theme catalogs, hero/feature/CTA page rhythms, or replacing `shift-colors.ts` / CSS token surfaces.

## Allowed verbs

| Verb | Use in this repo |
| --- | --- |
| `hallmark audit <target>` | **Yes** — score UI for AI-slop tells; punch list only, no edits |
| `hallmark study <screenshot \| URL>` | **Yes** — extract design DNA for reference; stop at diagnosis unless user explicitly builds a **non-ERP** surface |
| `hallmark` (default build) | **No** on ERP routes (see below) |
| `hallmark redesign <target>` | **No** on ERP routes; requires explicit user approval + must preserve spreadsheet/pastel/token rules |

Load upstream protocol from `.agents/skills/hallmark/SKILL.md` and `references/verbs/audit.md` or `references/study.md` **only** for allowed verbs.

## Off-limits (Hallmark must not build or redesign)

Core ERP surfaces — treat as immutable design system unless the user explicitly overrides ERP rules:

- `src/app/[locale]/inventory/**` — spreadsheet grid, inline inputs, no edit modals
- `src/app/[locale]/schedule/**` — DnD, pastel shift cards
- `src/app/[locale]/dashboard/**`
- `src/app/[locale]/maintenance/**`
- `src/app/[locale]/settings/**` (except isolated empty-state copy review via audit)
- `src/components/**` shared UI that backs the above
- Any `<td>` inline `<input>` spreadsheet pattern
- Pastel time cards (`shift-colors.ts`, `bb-pastel-surface`, `PASTEL_SURFACE`)

## Allowed audit targets (supplementary polish)

- `src/components/notifications/**`
- `src/components/shell/DeferredOverlays.tsx` (layout/a11y slop only — not brand overhaul)
- Pin / auth gateway shells
- Empty states, toasts, onboarding one-offs
- Future marketing or landing routes **outside** `[locale]` ERP shell

## Audit focus for ERP

When auditing ERP UI, prioritize Hallmark gates that catch **generic AI tells** without fighting the minimalist ERP system:

- Invented metrics / fake social proof
- Gradient blobs, glassmorphism, decorative card grids
- Italic display headings, purple-on-white SaaS palette
- Hero → 3-feature → CTA template rhythm on tool pages
- Re-drawn browser/phone chrome
- Modals where inline spreadsheet edit is required
- Hardcoded `bg-white` / `text-black` instead of theme tokens
- Missing `bb-pastel-surface` on pastel shift containers

**Do not** flag as slop: sparse tables, dense grids, time-based pastel hex, black text on pastel, minimal chrome, or outcome-first data layouts.

## When the user wants better ERP UI

Do **not** run Hallmark default/redesign. Use instead:

1. `web-design-guidelines` — spacing, type, a11y
2. `impeccable` — `critique` sub-command only (not `bolder` / `delight` / `overdrive`)
3. `chrome-modern-web-guidance` — Baseline overlays, mobile, forms

## Update upstream skill

```bash
npx skills add nutlope/hallmark -y
```

Re-read this overlay after updates; upstream `SKILL.md` changes do not relax ERP constraints.
