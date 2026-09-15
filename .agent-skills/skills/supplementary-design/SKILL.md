---
name: supplementary-design
description: Run the four supplementary design skills under ERP overlay (extract, composition, mobile, motion)
user-invocable: true
---

# Supplementary design (4 skills)

**Always read first:** `.cursor/skills/supplementary-design-erp/SKILL.md`

## Run

```bash
npm run skill:run supplementary-design
npm run skill:run supplementary-design -- --target inventory
npm run skill:run supplementary-design -- --target schedule
```

## Per-skill checklist

### 1. extract-design-system (ERP mode)

- Read `docs/erp-design-tokens.md`, `src/lib/ui-outlined-tokens.ts`, `shift-colors.ts`
- Do **not** run `npx extract-design-system <url>` unless user explicitly wants external scrape

### 2. vercel-composition-patterns

- Target: `InventoryModalHeader`, modal shells, FAB wrappers, `*Client.tsx` layout
- Avoid: spreadsheet rows, notification hub logic

### 3. sleek-design-mobile-apps

- If `SLEEK_API_KEY` unset: use `chrome-modern-web-guidance` for touch/safe-area/sheets
- If set: Sleek screenshots as reference only; map to ERP tokens before code

### 4. emil-design-eng

- Apply `toFramerPhaseVariants` on panels/sheets/FAB
- No motion on grid cells; honor `prefers-reduced-motion`

## After UI changes

```bash
npm run skill:run design-review -- --target <path>
npm run test:notifications   # if notification UI touched
```
