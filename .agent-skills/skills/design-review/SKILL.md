---
name: design-review
description: Run the ERP three-pass UI review (web-design-guidelines, impeccable critique, ui-ux-pro-max via overlay)
user-invocable: true
---

# Design Review (3 skills)

BLACKANDBREW ERP uses **three installed design skills in a fixed order**. ERP rules in `AGENTS.md` and `docs/design.md` always win over upstream suggestions.

## Order (do not skip)

1. **web-design-guidelines** (`.agents/skills/web-design-guidelines/SKILL.md`)
   - Fetch fresh rules: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
   - Review target files; output `file:line` findings only.
2. **impeccable critique** (`.agents/skills/impeccable/SKILL.md` → `critique` only)
   - Windows: `.agents/skills/impeccable/scripts/impeccable.cmd context --target "<path>"`
   - Unix: `.agents/skills/impeccable/scripts/impeccable context --target "<path>"`
   - Mode **Operate** for inventory, schedule, settings, notifications.
   - Do **not** use `bolder`, `delight`, or `overdrive` on core ERP routes.
3. **ui-ux-pro-max-erp** (`.cursor/skills/ui-ux-pro-max-erp/SKILL.md`)
   - Gap-fill after steps 1–2; allowed: `--domain ux`, `--stack nextjs`, `--stack shadcn`.
   - Forbidden: `--design-system`, `--domain style|color|typography|product|landing`.

Optional fourth pass (supplementary): **hallmark-erp** `audit` only, never `redesign`.

## Quick scan (terminal)

Heuristic pre-pass before manual guideline review:

```bash
npm run skill:run design-review -- --target src/components/notifications/NotificationPanel.tsx
```

Omit `--target` to scan `src/components` and `src/app/[locale]/settings`.

## UX search examples

```powershell
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "touch target minimum size mobile" --domain ux -n 5
py -3 .agents/skills/ui-ux-pro-max/scripts/search.py "dialog focus trap escape" --stack shadcn -n 5
```

## Hard filters (ERP)

- Pastel: `shift-colors.ts` + `bb-pastel-surface`
- Surfaces: theme tokens only on non-pastel UI
- Spreadsheet: inline grid edits, no edit modals for simple cells
- Notification panel: view-only rows (`notification-panel-view-only-standard`)

## After notification UI changes

```bash
npm run skill:run notification-smoke
```
