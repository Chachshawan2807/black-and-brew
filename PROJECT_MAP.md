# PROJECT_MAP — BLACK-AND-BREW ERP

> **Generated:** 2026-06-04 00:24:12 (GMT+7) | **Root:** `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` | **Tool:** RepoMap v2.0 (stdlib-only)

---

## 📊 File Type Summary

| Extension | Count |
|-----------|-------|
| `.tsx` | 44 |
| `.ts` | 42 |
| `.md` | 35 |
| `.sql` | 12 |
| `.json` | 11 |
| `.mjs` | 2 |
| `.txt` | 1 |
| `.js` | 1 |
| `.css` | 1 |
| `.example` | 1 |
| `.local` | 1 |
| `(no ext)` | 1 |
| **TOTAL** | **154** |

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
|-- [DIR] .cursor/
|-- [DIR] .vscode/
|   |-- extensions.json (78 B)
|   |-- launch.json (901 B)
|   +-- settings.json (443 B)
|-- [DIR] docs/
|   |-- [DIR] plans/
|   |   +-- 2026-06-03-mobile-inventory-ui-fixes.md (2.9 KB)
|   |-- agent.md (4.0 KB)
|   |-- api.md (5.7 KB)
|   |-- architecture.md (3.3 KB)
|   |-- changelog.md (15.4 KB)
|   |-- context.md (3.7 KB)
|   |-- database.md (6.0 KB)
|   |-- design.md (8.6 KB)
|   |-- MASTER_BLUEPRINT.md (12.2 KB)
|   |-- master_lint_prompt.txt (4.1 KB)
|   |-- memory.md (96.2 KB)
|   |-- prd.md (5.7 KB)
|   |-- rules.md (9.0 KB)
|   |-- skills.md (9.2 KB)
|   |-- SOP.md (2.8 KB)
|   |-- SPEC_TEMPLATE.md (1.2 KB)
|   +-- tasks.md (3.6 KB)
|-- [DIR] messages/
|   |-- en.json (1.1 KB)
|   +-- th.json (2.0 KB)
|-- [DIR] public/
|   |-- [DIR] images/
|   +-- sw.js (2.0 KB)
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
|   |   |   |   |   |-- LiveShiftList.tsx (14.7 KB)
|   |   |   |   |   |-- LiveStatusTracker.tsx (3.0 KB)
|   |   |   |   |   |-- MonthlyRoster.tsx (13.0 KB)
|   |   |   |   |   +-- ShiftCard.tsx (3.5 KB)
|   |   |   |   |-- page.tsx (3.6 KB)
|   |   |   |   +-- types.ts (392 B)
|   |   |   |-- [DIR] inventory/
|   |   |   |   |-- [DIR] count/
|   |   |   |   |   +-- page.tsx (9.0 KB)
|   |   |   |   |-- page.tsx (83.1 KB)
|   |   |   |   +-- PurchaseOrdersModal.tsx (9.1 KB)
|   |   |   |-- [DIR] maintenance/
|   |   |   |   +-- page.tsx (38.6 KB)
|   |   |   |-- [DIR] market-insights/
|   |   |   |   |-- loading.tsx (583 B)
|   |   |   |   +-- page.tsx (18.0 KB)
|   |   |   |-- [DIR] sales/
|   |   |   |   +-- page.tsx (27.7 KB)
|   |   |   |-- [DIR] schedule/
|   |   |   |   |-- page.tsx (2.2 KB)
|   |   |   |   +-- ScheduleClient.tsx (78.5 KB)
|   |   |   |-- globals.css (2.3 KB)
|   |   |   |-- layout.tsx (2.4 KB)
|   |   |   |-- LiveStatusTracker.tsx (3.0 KB)
|   |   |   +-- page.tsx (2.6 KB)
|   |   |-- [DIR] actions/
|   |   |   |-- [DIR] tools/
|   |   |   |   |-- database-tools.ts (7.8 KB)
|   |   |   |   |-- internal-sources-tools.ts (3.0 KB)
|   |   |   |   +-- search-tools.ts (1.3 KB)
|   |   |   |-- auth.ts (1.2 KB)
|   |   |   |-- daily-report-actions.ts (21.3 KB)
|   |   |   |-- holiday-actions.ts (1.7 KB)
|   |   |   |-- inventory-actions.ts (12.1 KB)
|   |   |   |-- line-actions.ts (1.7 KB)
|   |   |   |-- market-insights-actions.ts (9.7 KB)
|   |   |   |-- migrate-inventory-sort-order.ts (3.9 KB)
|   |   |   |-- MonthlyRoster.tsx (0 B)
|   |   |   |-- sales-actions.ts (23.0 KB)
|   |   |   +-- shift-actions.ts (11.4 KB)
|   |   |-- [DIR] api/
|   |   |   |-- [DIR] chat/
|   |   |   |   |-- middleware.ts (0 B)
|   |   |   |   |-- route.ts (35.8 KB)
|   |   |   |   +-- th.json (0 B)
|   |   |   |-- [DIR] daily-report/
|   |   |   |   +-- route.ts (2.0 KB)
|   |   |   +-- [DIR] weather/
|   |   |       +-- route.ts (2.8 KB)
|   |   |-- manifest.ts (616 B)
|   |   +-- page.tsx (156 B)
|   |-- [DIR] components/
|   |   |-- [DIR] ai/
|   |   |   |-- AIChatOverlay.tsx (13.5 KB)
|   |   |   +-- AIChatWrapper.tsx (208 B)
|   |   |-- [DIR] auth/
|   |   |   +-- PinGateway.tsx (7.6 KB)
|   |   |-- [DIR] dashboard/
|   |   |   |-- LiveStatusTracker.tsx (7.9 KB)
|   |   |   +-- WeatherWidget.tsx (5.4 KB)
|   |   |-- [DIR] providers/
|   |   |   +-- I18nProvider.tsx (540 B)
|   |   |-- [DIR] sidebar/
|   |   |   |-- CollapseMenuButton.tsx (5.3 KB)
|   |   |   |-- Menu.tsx (5.5 KB)
|   |   |   |-- SheetMenu.tsx (779 B)
|   |   |   |-- Sidebar.tsx (2.0 KB)
|   |   |   |-- SidebarLayout.tsx (1.9 KB)
|   |   |   +-- SidebarToggle.tsx (859 B)
|   |   |-- [DIR] ui/
|   |   |   |-- button.tsx (1.8 KB)
|   |   |   |-- ClickableDatePicker.tsx (6.7 KB)
|   |   |   |-- ClickableInput.tsx (2.1 KB)
|   |   |   |-- collapsible.tsx (329 B)
|   |   |   |-- dropdown-menu.tsx (7.1 KB)
|   |   |   |-- scroll-area.tsx (1.6 KB)
|   |   |   |-- sheet.tsx (4.2 KB)
|   |   |   +-- tooltip.tsx (1.1 KB)
|   |   |-- CommandCenterGrid.tsx (6.8 KB)
|   |   +-- PwaRegister.tsx (632 B)
|   |-- [DIR] hooks/
|   |   |-- use-sidebar-toggle.ts (485 B)
|   |   +-- use-store.ts (465 B)
|   |-- [DIR] i18n/
|   |   |-- request.ts (733 B)
|   |   +-- routing.ts (294 B)
|   |-- [DIR] lib/
|   |   |-- [DIR] agents/
|   |   |   +-- executive-rules.ts (9.5 KB)
|   |   |-- date-utils.ts (992 B)
|   |   |-- menu-list.ts (2.4 KB)
|   |   |-- supabase.ts (1.3 KB)
|   |   |-- timezone.ts (629 B)
|   |   +-- utils.ts (166 B)
|   |-- [DIR] test/
|   |   |-- auth.test.ts (1.5 KB)
|   |   |-- basic.test.ts (458 B)
|   |   |-- daily_report_actions.test.ts (14.5 KB)
|   |   |-- dashboard_date_cookies.test.ts (2.8 KB)
|   |   |-- date_compliance.test.ts (903 B)
|   |   |-- mobile_layout.test.tsx (3.8 KB)
|   |   |-- run_migration.test.ts (1.8 KB)
|   |   |-- session_auth.test.tsx (2.4 KB)
|   |   |-- setup.ts (494 B)
|   |   +-- zero_persistence.test.ts (872 B)
|   |-- [DIR] types/
|   |   +-- index.ts (496 B)
|   |-- [DIR] utils/
|   |   +-- thaiTokenOptimizer.ts (428 B)
|   +-- middleware.ts (244 B)
|-- .env.example (1.6 KB)
|-- .env.local (1.3 KB)
|-- .gitignore (1.0 KB)
|-- add_inventory_sort_order.sql (531 B)
|-- AGENTS.md (5.2 KB)
|-- apply_rls_transactions.sql (1.1 KB)
|-- CLAUDE.md (11 B)
|-- DB_SCHEMA.sql (2.4 KB)
|-- eslint.config.mjs (465 B)
|-- fix_transaction_relationships.sql (1.8 KB)
|-- inventory-items.csv (5.8 KB)
|-- inventory_config_schema.sql (1.1 KB)
|-- inventory_master_access.sql (561 B)
|-- inventory_schema_sync.sql (701 B)
|-- MASTER_BLUEPRINT.md (26.5 KB)
|-- next-env.d.ts (251 B)
|-- next.config.ts (490 B)
|-- package-lock.json (418.9 KB)
|-- package.json (1.8 KB)
|-- postcss.config.mjs (94 B)
|-- PROJECT_MAP.md (6.9 KB)
|-- PROTOCOL_ENFORCER.md (9.8 KB)
|-- README.md (4.5 KB)
|-- sales_schema.sql (1.6 KB)
|-- setup_inventory_transactions.sql (2.2 KB)
|-- skills-lock.json (535 B)
|-- SKILLS_INVENTORY.md (9.8 KB)
|-- tsconfig.json (681 B)
|-- tsconfig.tsbuildinfo (365.8 KB)
|-- update_rls_policies.sql (2.8 KB)
|-- vercel.json (26 B)
|-- VERIFICATION_REPORT.md (2.8 KB)
+-- vitest.config.ts (384 B)
```

---

## ⚙️ Active Modules (Top-Level)

| Module | Path | Status |
|--------|------|--------|
| Dashboard | `src/app/[locale]/dashboard/` | [OK] Active |
| Schedule  | `src/app/[locale]/schedule/`  | [OK] Active |
| Maintenance | `src/app/[locale]/maintenance/` | [OK] Active |
| Inventory | `src/app/[locale]/inventory/` | [OK] Active |
| Sales     | `src/app/[locale]/sales/`     | [OK] Active |
| Market Insights | `src/app/[locale]/market-insights/` | [OK] Active |


---

> _RepoMap is a zero-dependency context tool. Run before every Audit task to reduce token usage._
