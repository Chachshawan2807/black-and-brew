# ERP design tokens (agent reference)

Extracted from the live codebase (ERP mode `extract-design-system`). **Do not replace** with scraped third-party palettes.

## Authority order

1. `AGENTS.md` + `docs/design.md`
2. `src/lib/shift-colors.ts` (time-based pastel hex)
3. `src/lib/ui-outlined-tokens.ts` (buttons, fields, chips, FAB shell)
4. `src/app/[locale]/globals.css` (`:root` / `.dark`, `--bb-*` motion)
5. `src/lib/motion-presets.ts` (Framer presets, `toFramerPhaseVariants`)

## Theme surfaces (non-pastel)

| Token utility | Use |
| --- | --- |
| `bg-background` | Page shell |
| `bg-card` | Cards, modals, panels |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text |
| `border-border` | Borders |

Theme: `next-themes`, `storageKey="bb-theme"`.

## Pastel (shift / quick actions / metrics)

- Hex from `shift-colors.ts` only for time-based or domain accents.
- Always pair with `bb-pastel-surface` or `bbPastelClass()` / `PASTEL_SURFACE`.
- Text and icons on pastel stay black in both themes.

## Outlined UI (`ui-outlined-tokens.ts`)

| Export | Role |
| --- | --- |
| `BB_BTN_OUTLINE` / `_PRIMARY` / `_DANGER` / `_SM` | Actions (min 44px, focus ring) |
| `BB_BTN_ICON` / `BB_BTN_CLOSE` | Icon controls |
| `BB_FIELD_INPUT` / `BB_FIELD_INPUT_MUTED` | Form fields |
| `BB_DATA_CARD` / `BB_DATA_LIST` | Section shells |
| `BB_FAB_SHELL` | FAB border shell (fill from shift-colors) |
| `BB_CHIP_*` | Filter chips (theme or pastel variants) |

## Motion (`motion-presets.ts`)

| Preset | Use |
| --- | --- |
| `modalContent` / `modalSheetBottom` | Inventory modals |
| `notificationPanel` / `notificationOverlay` | Notification panel |
| `fabTrigger` | FAB stack |
| `toFramerPhaseVariants` | Enter `MODAL_EASE`, exit `MODAL_EXIT_EASE` |
| `withReducedMotion` | `prefers-reduced-motion` |

CSS: `bb-transition` lists explicit properties (never `transition: all`).

## Composition anchors (inventory)

| Component | Path |
| --- | --- |
| Modal header compound | `InventoryModalHeader` in `inventory-ui-primitives.tsx` |
| Add item (FAB) | `InventoryAddItemModal.tsx` |
| Add item (grid toolbar) | `InventoryClient.tsx` inline modal (insert position + undo) |
| Motion hook | `useInventoryMotion()` |

## Mobile (no Sleek API required)

- Safe area: `env(safe-area-inset-*)` on modals, FABs, schedule footers.
- Scroll: `bb-smooth-scroll`, `overscroll-y-contain` in sheets.
- Touch: `touch-manipulation`, min 44px on actions.
- Skill: `.cursor/skills/chrome-modern-web-guidance/SKILL.md`

## Agent workflow (four supplementary skills)

Read `.cursor/skills/supplementary-design-erp/SKILL.md` first, then:

```bash
npm run skill:run supplementary-design
```

See `docs/design.md` sections 14–15.
