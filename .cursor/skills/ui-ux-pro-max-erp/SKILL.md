---
name: ui-ux-pro-max-erp
description: |
  BLACKANDBREW ERP overlay for UI/UX Pro Max review and checklist only.
  Use for supplementary UX/a11y/stack checks after web-design-guidelines and
  impeccable critique. NEVER use to replace ERP pastel, spreadsheet, or token rules.

  MANDATORY: read this file before `.agents/skills/ui-ux-pro-max/SKILL.md` in this repo.
---

# UI/UX Pro Max BLACKANDBREW ERP (review only)

Upstream skill: `.agents/skills/ui-ux-pro-max/` (v2.15+). **Does not drive ERP visual identity** in this project.

## Rule priority

When UI/UX Pro Max conflicts with `AGENTS.md`, **ERP rules win**:

1. ERP domain rules (spreadsheet grids, pastel shift colors, theme tokens, data symmetry)
2. `chrome-modern-web-guidance` + `modern-web-guidance`
3. React & Next.js skills
4. `web-design-guidelines`, `impeccable` (`critique` only)
5. **UI/UX Pro Max** review/checklist only (this overlay)
6. Hallmark `audit` / `study` via `hallmark-erp` overlay

Reject upstream output that suggests: modals for grid edits, decorative marketing layouts, non-pastel surfaces, new color/style catalogs, hero/feature/CTA page rhythms, glassmorphism, or replacing `shift-colors.ts` / CSS token surfaces.

## When to use (allowed)

Use **after** `web-design-guidelines` and `impeccable critique` when you need a second pass on:

- Accessibility outcomes (focus, contrast roles, reduced motion, form errors)
- Touch targets, loading feedback, mobile layout
- Next.js / shadcn implementation patterns for existing components

## Allowed search modes

Run from project root:

```powershell
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux [-n <max>]
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs [-n <max>]
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack shadcn [-n <max>]
```

Example queries:

```powershell
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "inline validation error summary" --domain ux
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "dialog modal focus trap" --stack nextjs
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "form field accessible label" --stack shadcn
```

Also allowed: read `references/quick-reference.md` §1–3 (accessibility, touch, performance) as a checklist.

## Forbidden search modes (ERP)

| Mode | Why |
| --- | --- |
| `--design-system` | Generates palettes/styles that override ERP pastel + tokens |
| `--persist` / `--force` | Writes design-system files that bypass repo rules |
| `--domain style` | Conflicts with minimalist ERP + time-based pastel |
| `--domain color` | Conflicts with `shift-colors.ts` and CSS tokens |
| `--domain typography` | Conflicts with existing ERP type scale |
| `--domain product` / `landing` | SaaS/marketing patterns not applicable to ERP tools |
| `--domain gsap` | Decorative motion; use reduced-motion-safe micro-interactions only |
| `--variance` / `--motion` / `--density` dials | Tune marketing aesthetics, not ERP grids |

## Hard filters (always apply)

Before applying any search result:

- **Pastel:** time-based shift colors from `shift-colors.ts` only; append `bb-pastel-surface` / `PASTEL_SURFACE` on pastel containers
- **Surfaces:** `bg-background`, `bg-card`, `text-foreground`, `border-border` on non-pastel UI; never `bg-white` / hardcoded hex on standard surfaces
- **Spreadsheet:** inline `<input>` in `<td>` for inventory grids; no edit modals for simple cell edits
- **Overlays:** prefer native `<dialog>` + `.showModal()` per chrome-modern-web-guidance
- **Typography:** no em dash (U+2014) in UI copy

## Off-limits surfaces (checklist only, no redesign)

- `src/app/[locale]/inventory/**` spreadsheet grid
- `src/app/[locale]/schedule/**` pastel shift cards
- `src/app/[locale]/dashboard/**`, `maintenance/**`, `settings/**` core layouts
- `src/lib/shift-colors.ts` and global CSS token definitions

## Serious polish workflow

1. `web-design-guidelines` spacing, type, a11y
2. `impeccable` `critique` sub-command only (not `bolder` / `delight` / `overdrive`)
3. `chrome-modern-web-guidance` Baseline overlays, mobile, forms
4. **Then** UI/UX Pro Max `--domain ux` or `--stack nextjs` / `shadcn` for gap fill

## Update upstream skill

```bash
npx skills add nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max -y
```

Re-read this overlay after updates; upstream `SKILL.md` changes do not relax ERP constraints.
