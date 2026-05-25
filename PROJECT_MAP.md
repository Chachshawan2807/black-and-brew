# PROJECT_MAP — BLACK-AND-BREW ERP

> **Generated:** 2026-05-25 22:17:14 (GMT+7) | **Root:** `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` | **Tool:** RepoMap v2.0 (stdlib-only)

---

## 📊 File Type Summary

| Extension | Count |
|-----------|-------|
| `.md` | 38 |
| `.tsx` | 32 |
| `.ts` | 31 |
| `.sql` | 11 |
| `.json` | 9 |
| `.mjs` | 2 |
| `.txt` | 1 |
| `.css` | 1 |
| `.example` | 1 |
| `.local` | 1 |
| `(no ext)` | 1 |
| `.tsbuildinfo` | 1 |
| **TOTAL** | **129** |

---

## 🌲 Project Structure

```
black-and-brew/
|-- [DIR] .agents/
|   +-- [DIR] skills/
|       |-- [DIR] gemini-api/
|       |   |-- [DIR] references/
|       |   |   |-- advanced_features.md (4.4 KB)
|       |   |   |-- bounding_box.md (1.8 KB)
|       |   |   |-- embeddings.md (591 B)
|       |   |   |-- live_api.md (1.0 KB)
|       |   |   |-- media_generation.md (3.0 KB)
|       |   |   |-- model_tuning.md (934 B)
|       |   |   |-- safety.md (1.8 KB)
|       |   |   |-- structured_and_tools.md (3.7 KB)
|       |   |   +-- text_and_multimodal.md (2.3 KB)
|       |   +-- SKILL.md (9.6 KB)
|       +-- [DIR] google-cloud-waf-security/
|           +-- SKILL.md (14.2 KB)
|-- [DIR] .vscode/
|   |-- extensions.json (78 B)
|   |-- launch.json (901 B)
|   +-- settings.json (443 B)
|-- [DIR] docs/
|   |-- [DIR] plans/
|   |   |-- 2026-05-17-control-panel-restructure.md (1.6 KB)
|   |   |-- 2026-05-17-po-multi-select.md (1.4 KB)
|   |   |-- 2026-05-17-single-row-buttons.md (1.2 KB)
|   |   |-- 2026-05-18-session-storage-auth-enforcement.md (2.7 KB)
|   |   |-- 2026-05-19-local-scheduler-data-schema-compliance.md (3.1 KB)
|   |   +-- 2026-05-21-restore-nextjs-middleware.md (1.7 KB)
|   |-- agent.md (4.0 KB)
|   |-- api.md (5.7 KB)
|   |-- architecture.md (3.3 KB)
|   |-- changelog.md (2.2 KB)
|   |-- context.md (3.7 KB)
|   |-- database.md (6.0 KB)
|   |-- design.md (5.8 KB)
|   |-- MASTER_BLUEPRINT.md (10.4 KB)
|   |-- master_lint_prompt.txt (4.1 KB)
|   |-- memory.md (57.8 KB)
|   |-- prd.md (5.5 KB)
|   |-- rules.md (7.4 KB)
|   |-- skills.md (7.2 KB)
|   |-- SOP.md (2.8 KB)
|   +-- tasks.md (3.6 KB)
|-- [DIR] messages/
|   |-- en.json (720 B)
|   +-- th.json (1.3 KB)
|-- [DIR] public/
|   +-- [DIR] images/
|-- [DIR] sql/
|   |-- [DIR] sql/
|   |   +-- ai_agent_views_v2.sql (2.0 KB)
|   +-- ai_agent_views.sql (1.9 KB)
|-- [DIR] src/
|   |-- [DIR] app/
|   |   |-- [DIR] [locale]/
|   |   |   |-- [DIR] dashboard/
|   |   |   |   |-- [DIR] components/
|   |   |   |   |   |-- InventorySummaryCard.tsx (1.4 KB)
|   |   |   |   |   |-- LiveShiftList.tsx (13.7 KB)
|   |   |   |   |   +-- ShiftCard.tsx (3.5 KB)
|   |   |   |   |-- page.tsx (2.9 KB)
|   |   |   |   +-- types.ts (392 B)
|   |   |   |-- [DIR] inventory/
|   |   |   |   +-- page.tsx (70.7 KB)
|   |   |   |-- [DIR] maintenance/
|   |   |   |   +-- page.tsx (38.6 KB)
|   |   |   |-- [DIR] schedule/
|   |   |   |   |-- page.tsx (2.2 KB)
|   |   |   |   +-- ScheduleClient.tsx (63.3 KB)
|   |   |   |-- globals.css (2.3 KB)
|   |   |   |-- layout.tsx (2.0 KB)
|   |   |   +-- page.tsx (1.5 KB)
|   |   |-- [DIR] actions/
|   |   |   |-- [DIR] tools/
|   |   |   |   |-- database-tools.ts (2.2 KB)
|   |   |   |   +-- search-tools.ts (1.3 KB)
|   |   |   |-- auth.ts (1.2 KB)
|   |   |   |-- holiday-actions.ts (1.7 KB)
|   |   |   |-- inventory-actions.ts (7.1 KB)
|   |   |   +-- shift-actions.ts (4.1 KB)
|   |   |-- [DIR] api/
|   |   |   |-- [DIR] chat/
|   |   |   |   +-- route.ts (6.6 KB)
|   |   |   +-- [DIR] weather/
|   |   |       +-- route.ts (2.7 KB)
|   |   +-- page.tsx (156 B)
|   |-- [DIR] components/
|   |   |-- [DIR] ai/
|   |   |   |-- AIChatOverlay.tsx (13.0 KB)
|   |   |   +-- AIChatWrapper.tsx (208 B)
|   |   |-- [DIR] auth/
|   |   |   +-- PinGateway.tsx (7.6 KB)
|   |   |-- [DIR] dashboard/
|   |   |   +-- WeatherWidget.tsx (4.9 KB)
|   |   |-- [DIR] providers/
|   |   |   +-- I18nProvider.tsx (540 B)
|   |   |-- [DIR] sidebar/
|   |   |   |-- CollapseMenuButton.tsx (5.2 KB)
|   |   |   |-- Menu.tsx (4.5 KB)
|   |   |   |-- SheetMenu.tsx (779 B)
|   |   |   |-- Sidebar.tsx (1.5 KB)
|   |   |   |-- SidebarLayout.tsx (699 B)
|   |   |   +-- SidebarToggle.tsx (859 B)
|   |   |-- [DIR] ui/
|   |   |   |-- button.tsx (1.8 KB)
|   |   |   |-- ClickableDatePicker.tsx (1.9 KB)
|   |   |   |-- ClickableInput.tsx (2.1 KB)
|   |   |   |-- collapsible.tsx (329 B)
|   |   |   |-- dropdown-menu.tsx (7.1 KB)
|   |   |   |-- scroll-area.tsx (1.6 KB)
|   |   |   |-- sheet.tsx (4.2 KB)
|   |   |   +-- tooltip.tsx (1.1 KB)
|   |   +-- CommandCenterGrid.tsx (6.8 KB)
|   |-- [DIR] hooks/
|   |   |-- use-sidebar-toggle.ts (485 B)
|   |   +-- use-store.ts (465 B)
|   |-- [DIR] i18n/
|   |   |-- request.ts (733 B)
|   |   +-- routing.ts (294 B)
|   |-- [DIR] lib/
|   |   |-- [DIR] agents/
|   |   |   +-- executive-rules.ts (2.6 KB)
|   |   |-- date-utils.ts (992 B)
|   |   |-- menu-list.ts (1.7 KB)
|   |   |-- supabase.ts (1.3 KB)
|   |   |-- timezone.ts (629 B)
|   |   +-- utils.ts (166 B)
|   |-- [DIR] test/
|   |   |-- auth.test.ts (1.5 KB)
|   |   |-- basic.test.ts (458 B)
|   |   |-- dashboard_date_cookies.test.ts (2.8 KB)
|   |   |-- date_compliance.test.ts (903 B)
|   |   |-- session_auth.test.tsx (2.4 KB)
|   |   |-- setup.ts (494 B)
|   |   +-- zero_persistence.test.ts (872 B)
|   |-- [DIR] types/
|   |   +-- index.ts (496 B)
|   |-- [DIR] utils/
|   |   +-- thaiTokenOptimizer.ts (428 B)
|   +-- proxy.ts (244 B)
|-- .env.example (1.1 KB)
|-- .env.local (954 B)
|-- .gitignore (820 B)
|-- add_inventory_sort_order.sql (531 B)
|-- AGENTS.md (5.2 KB)
|-- apply_rls_transactions.sql (1.1 KB)
|-- CLAUDE.md (11 B)
|-- DB_SCHEMA.sql (2.4 KB)
|-- eslint.config.mjs (465 B)
|-- fix_transaction_relationships.sql (1.8 KB)
|-- inventory_config_schema.sql (1.1 KB)
|-- inventory_master_access.sql (561 B)
|-- inventory_schema_sync.sql (701 B)
|-- MASTER_BLUEPRINT.md (22.1 KB)
|-- next-env.d.ts (251 B)
|-- next.config.ts (490 B)
|-- package-lock.json (399.7 KB)
|-- package.json (1.7 KB)
|-- postcss.config.mjs (94 B)
|-- PROJECT_MAP.md (4.4 KB)
|-- PROTOCOL_ENFORCER.md (7.5 KB)
|-- README.md (4.5 KB)
|-- setup_inventory_transactions.sql (2.2 KB)
|-- skills-lock.json (535 B)
|-- SKILLS_INVENTORY.md (9.8 KB)
|-- tsconfig.json (681 B)
|-- tsconfig.tsbuildinfo (287.2 KB)
|-- update_rls_policies.sql (1.4 KB)
+-- vitest.config.ts (384 B)
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
