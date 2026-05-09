# PROJECT_MAP — BLACK-AND-BREW ERP

> **Generated:** 2026-05-08 10:58:27 (GMT+7) | **Root:** `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` | **Tool:** RepoMap v2.0 (stdlib-only)

---

## 📊 File Type Summary

| Extension | Count |
|-----------|-------|
| `.tsx` | 24 |
| `.md` | 19 |
| `.ts` | 16 |
| `.json` | 7 |
| `.py` | 4 |
| `.mjs` | 2 |
| `.css` | 1 |
| `.local` | 1 |
| `(no ext)` | 1 |
| `.sql` | 1 |
| `.tsbuildinfo` | 1 |
| **TOTAL** | **77** |

---

## 🌲 Project Structure

```
black-and-brew/
|-- [DIR] .agents/
|   +-- [DIR] skills/
|       |-- [DIR] gemini-api/
|       |   |-- [DIR] references/
|       |   |   |-- advanced_features.md (4.5 KB)
|       |   |   |-- bounding_box.md (1.9 KB)
|       |   |   |-- embeddings.md (611 B)
|       |   |   |-- live_api.md (1.1 KB)
|       |   |   |-- media_generation.md (3.1 KB)
|       |   |   |-- model_tuning.md (971 B)
|       |   |   |-- safety.md (1.9 KB)
|       |   |   |-- structured_and_tools.md (3.8 KB)
|       |   |   +-- text_and_multimodal.md (2.3 KB)
|       |   +-- SKILL.md (9.8 KB)
|       +-- [DIR] google-cloud-waf-security/
|           +-- SKILL.md (14.5 KB)
|-- [DIR] grep_ast/
|   |-- __init__.py (392 B)
|   |-- parsers.py (38 B)
|   +-- tsl.py (55 B)
|-- [DIR] messages/
|   |-- en.json (216 B)
|   +-- th.json (408 B)
|-- [DIR] public/
|   +-- [DIR] images/
|-- [DIR] src/
|   |-- [DIR] app/
|   |   |-- [DIR] [locale]/
|   |   |   |-- [DIR] dashboard/
|   |   |   |   |-- [DIR] components/
|   |   |   |   |   |-- LiveShiftList.tsx (12.7 KB)
|   |   |   |   |   +-- ShiftCard.tsx (3.5 KB)
|   |   |   |   |-- page.tsx (2.6 KB)
|   |   |   |   +-- types.ts (392 B)
|   |   |   |-- [DIR] maintenance/
|   |   |   |   +-- page.tsx (31.2 KB)
|   |   |   |-- [DIR] schedule/
|   |   |   |   |-- page.tsx (1.5 KB)
|   |   |   |   +-- ScheduleClient.tsx (51.6 KB)
|   |   |   |-- globals.css (1.7 KB)
|   |   |   |-- layout.tsx (1.8 KB)
|   |   |   +-- page.tsx (4.9 KB)
|   |   |-- [DIR] actions/
|   |   |   |-- holiday-actions.ts (1.7 KB)
|   |   |   +-- shift-actions.ts (1.1 KB)
|   |   +-- page.tsx (172 B)
|   |-- [DIR] components/
|   |   |-- [DIR] providers/
|   |   |   +-- I18nProvider.tsx (540 B)
|   |   |-- [DIR] sidebar/
|   |   |   |-- CollapseMenuButton.tsx (5.2 KB)
|   |   |   |-- Menu.tsx (4.3 KB)
|   |   |   |-- SheetMenu.tsx (810 B)
|   |   |   |-- Sidebar.tsx (1.2 KB)
|   |   |   |-- SidebarLayout.tsx (696 B)
|   |   |   +-- SidebarToggle.tsx (863 B)
|   |   +-- [DIR] ui/
|   |       |-- button.tsx (1.7 KB)
|   |       |-- ClickableDatePicker.tsx (1.5 KB)
|   |       |-- ClickableInput.tsx (1.6 KB)
|   |       |-- collapsible.tsx (329 B)
|   |       |-- dropdown-menu.tsx (7.1 KB)
|   |       |-- scroll-area.tsx (1.6 KB)
|   |       |-- sheet.tsx (4.2 KB)
|   |       +-- tooltip.tsx (1.1 KB)
|   |-- [DIR] hooks/
|   |   |-- use-sidebar-toggle.ts (485 B)
|   |   +-- use-store.ts (340 B)
|   |-- [DIR] i18n/
|   |   |-- request.ts (733 B)
|   |   +-- routing.ts (294 B)
|   |-- [DIR] lib/
|   |   |-- date-utils.ts (920 B)
|   |   |-- menu-list.ts (1.2 KB)
|   |   |-- supabase.ts (1.3 KB)
|   |   |-- timezone.ts (629 B)
|   |   +-- utils.ts (166 B)
|   |-- [DIR] types/
|   |   +-- index.ts (466 B)
|   +-- middleware.ts (539 B)
|-- .env.local (263 B)
|-- .gitignore (649 B)
|-- AGENTS.md (1.8 KB)
|-- ai-capabilities.md (7.3 KB)
|-- CLAUDE.md (11 B)
|-- DB_SCHEMA.sql (1.3 KB)
|-- eslint.config.mjs (465 B)
|-- mem0.py (971 B)
|-- mem0_storage.json (365 B)
|-- next-env.d.ts (251 B)
|-- next.config.ts (310 B)
|-- package-lock.json (318.4 KB)
|-- package.json (1.2 KB)
|-- postcss.config.mjs (94 B)
|-- PROJECT_MAP.md (4.4 KB)
|-- README.md (1.4 KB)
|-- skills-lock.json (535 B)
|-- SKILLS_INVENTORY.md (3.9 KB)
|-- SPEC_ARCHITECTURE.md (12.8 KB)
|-- TASK_LIST.md (907 B)
|-- tsconfig.json (681 B)
+-- tsconfig.tsbuildinfo (229.6 KB)
```

---

## ⚙️ Active Modules (Top-Level)

| Module | Path | Status |
|--------|------|--------|
| Dashboard | `src/app/[locale]/dashboard/` | [OK] Active |
| Schedule  | `src/app/[locale]/schedule/`  | [OK] Active |
| Maintenance | `src/app/[locale]/maintenance/` | [OK] Active |
| Inventory | `scratch/archived-modules/inventory/` | [Archived] Archived |

---

> _RepoMap is a zero-dependency context tool. Run before every Audit task to reduce token usage._
