# Summary Report: Documentation & Feature Update

Last Updated: 2026-06-12 | Version: v8.4

---

## 1. Overview

รายงานสรุปการอัปเดตเอกสารทั้งหมดให้สอดคล้องกับโค้ดปัจจุบัน (v8.4 — dark theme + settings)

## 2. Files Updated (2026-06-12)

### 2.1 Root Documentation

| File | Changes |
| --- | --- |
| `README.md` | v8.4, Settings route, next-themes |
| `PROJECT_MAP.md` | Settings route, ThemeProvider |
| `AGENTS.md` | Dark theme / theme-token rules |
| `MASTER_BLUEPRINT.md` | Date bump |
| `SKILLS_INVENTORY.md` | v8.4 |

### 2.2 docs/ Directory

| File | Changes |
| --- | --- |
| `changelog.md` | Entry 2026-06-12 dark theme + doc sync v8.4 |
| `design.md` | Dual theme tokens, `bb-pastel-surface`, §11 Dark Theme |
| `rules.md` | CSS theme-token rules |
| `memory.md` | DEC-070 |
| `tasks.md` | Dark theme + doc sync completed |
| `architecture.md` | Settings route, next-themes, ThemeProvider |
| `context.md` | Settings module, v8.4 |
| `api.md`, `database.md` | Header v8.4 |
| `MASTER_BLUEPRINT.md` | Dual theme visual standard |

## 3. Files Updated (2026-06-07) — Historical

### 3.1 Root Documentation (2026-06-07)

| File | Changes |
| --- | --- |
| `README.md` | เขียนใหม่ทั้งหมด — features, setup, env, auth, architecture |
| `PROJECT_MAP.md` | โครงสร้างปัจจุบัน, `src/proxy.ts`, routes, server actions, tests |
| `MASTER_BLUEPRINT.md` | แก้ Zero-Display Logic ให้ตรง AGENTS.md |
| `SKILLS_INVENTORY.md` | อัปเดต v6.9, เพิ่ม auth + stock sync + motion modules |

### 3.2 docs/ Directory (2026-06-07)

| File | Changes |
| --- | --- |
| `changelog.md` | ลบเนื้อหาซ้ำ (2026-05-25–27); เพิ่ม entry 2026-06-07 |
| `context.md` | env vars ครบ, auth flow, modules ใหม่ |
| `architecture.md` | auth, AI, LINE, sales; `src/proxy.ts` |
| `api.md` | auth, shift, maintenance, sales, market insights, daily report |
| `database.md` | sales, service_records, regular_holidays, fix_inventory_rls |
| `prd.md` | Command Center, Sales, Market Insights, AI, LINE modules |
| `agent.md` | แก้ Agent Tools → `src/app/actions/tools/` |
| `tasks.md` | Phase 7 completed (auth, sales, security) |
| `skills.md` | PIN auth + RLS hardening capabilities |
| `MASTER_BLUEPRINT.md` | module table + date update |

### 3.3 Not Modified (2026-06-07)

- `.agents/skills/` — third-party skill references (gemini-api, google-cloud-waf-security)
- `docs/memory.md` — เพิ่ม DEC-064 เท่านั้น (decision log ยัง valid)
- `docs/design.md`, `docs/rules.md`, `docs/SOP.md` — ยังตรงกับ v6.9 (อัปเดต date header)

## 4. Prior Cycle (2026-06-04 to 2026-06-06) — v6.4–v6.9

- v6.8: Inventory stock single source of truth, CSV removal
- v6.9: Premium motion system (PageTransition, FloatingAlert)
- v6.7: Full security hardening, XSS sanitization
- v6.4: Sales + Market Insights UI unification

## 5. Known Documentation vs Code Notes

| Item | Note |
| --- | --- |
| `READ_ONLY_PIN` env | Documented in `.env.example` but code uses hardcoded `111222` |
| i18n middleware | File is `src/proxy.ts` (Next.js 16), not `src/middleware.ts` |
| `vercel.json` crons | Empty array — cron may be configured in Vercel Dashboard |
