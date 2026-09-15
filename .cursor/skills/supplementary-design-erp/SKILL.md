---
name: supplementary-design-erp
description: |
  BLACKANDBREW ERP overlay for extract-design-system, vercel-composition-patterns,
  sleek-design-mobile-apps, and emil-design-eng. Read before any upstream skill
  in this group. ERP pastel, spreadsheet, and token rules always win.

  MANDATORY: read this file before the upstream SKILL.md you invoke.
---

# Supplementary design skills (ERP overlay)

Upstream skills live under `.agents/skills/`. **Does not replace** `docs/design.md`, `ui-outlined-tokens.ts`, or `shift-colors.ts`.

## Rule priority

When upstream output conflicts with `AGENTS.md`:

1. ERP domain rules (spreadsheet, pastel, tokens, data symmetry)
2. `chrome-modern-web-guidance` + `modern-web-guidance`
3. React & Next.js skills
4. `web-design-guidelines`, `impeccable` (`critique` only), `ui-ux-pro-max-erp`
5. Hallmark `audit` / `study` via `hallmark-erp`
6. **This overlay** then the supplementary skill below

Reject upstream output that suggests: modals for grid edits, marketing hero layouts, non-token surfaces (`bg-white` on pages), new global palettes, glassmorphism, or replacing `shift-colors.ts` / `bb-pastel-surface`.

## Skill map (when to use)

| Skill | ERP use | Do not |
| --- | --- | --- |
| `extract-design-system` | **ERP mode (default):** read-only inventory of `docs/design.md`, `src/lib/ui-outlined-tokens.ts`, `src/app/[locale]/globals.css`, `src/lib/shift-colors.ts`. Write summaries to docs only with user OK. Optional: `impeccable` `document` / `extract` on a component folder. | `npx extract-design-system <url>`, `design-system/tokens.css`, or merging scraped colors into `globals.css` without explicit R2-style approval |
| `vercel-composition-patterns` | Refactor **shells**: modals, FAB stacks, toolbar compounds, layout wrappers on `*Client.tsx`. Compound components for quick-action bar / modal headers. | Spreadsheet `<td><input>` rows; moving notification sync out of `use-inventory-notifications.ts` hub; mass `forwardRef` removal in `components/ui` (Radix/shadcn) without a dedicated refactor task |
| `sleek-design-mobile-apps` | **Only if** `SLEEK_API_KEY` is set: Sleek editor prototypes and screenshots as **reference**. Implement in ERP only after mapping to theme tokens + pastel rules. | Applying Sleek "update navigation styling and structure" (upstream §Implement) to sidebar/shell; Sleek API for routine touch/safe-area fixes (use `chrome-modern-web-guidance` instead) |
| `emil-design-eng` | Motion on **panels, sheets, FAB, toasts** using `src/lib/motion-presets.ts`, `withReducedMotion`, `bb-transition` (no `transition: all`). Skip the skill's mandatory intro paragraph on ERP tasks. | Grid cell animation; keyboard-heavy paths (inventory grid tab/enter); `font-bold` / `font-semibold` (see `docs/design.md` typography); custom global easing tokens that bypass `--bb-*` CSS variables |

## Hard filters (always)

- Surfaces: `bg-background`, `bg-card`, `text-foreground`, `border-border`
- Pastel: time-based hex + `bb-pastel-surface` / `PASTEL_SURFACE`
- Spreadsheet: inline inputs in `<td>`; no edit modals for simple cell edits
- Notification hub: hub-first per `AGENTS.md` notification-hub-standard
- Typography: no em dash (U+2014)

## Compatibility audit (upstream vs ERP)

| Risk | Source | Mitigation in this repo |
| --- | --- | --- |
| Scrape external site → new palette | `extract-design-system` CLI | ERP mode = local files only; generated `design-system/` must not be imported by app without review |
| Replace app navigation from mockups | `sleek-design-mobile-apps` implement section | Treat Sleek output as reference; never replace `MobileNavHeader` / sidebar shell from Sleek alone |
| Compound provider splits notification state | `vercel-composition-patterns` state-lift | Notification domain stays hub-first; compose UI only around `NotificationProvider` |
| Frequent modal animation | `emil-design-eng` | Inventory quick-action / notification panel: keep reduced-motion paths; no extra enter animation on daily paths |
| `react19-no-forwardref` sweep | `vercel-composition-patterns` | React 19 is OK for **new** components; do not drive-by refactor all Radix primitives |

## Off-limits for structural redesign

- `src/app/[locale]/inventory/**` grid editing model
- `src/app/[locale]/schedule/**` pastel shift cards
- `src/lib/shift-colors.ts`, global CSS token definitions (change only with explicit user request)

## Update upstream

```bash
npx skills add arvindrk/extract-design-system@extract-design-system -y
npx skills add vercel-labs/agent-skills@vercel-composition-patterns -y
npx skills add sleekdotdesign/agent-skills@sleek-design-mobile-apps -y
npx skills add emilkowalski/skill@emil-design-eng -y
```

Re-read this overlay after each update.
