# Agent Guidelines — BLACKANDBREW ERP

> **Version:** 8.4 | **Last Updated:** 2026-06-12

---

## 1. AI Autonomy Level

### Full Permission Mode (100% AI Control)

- AI ได้รับอนุญาตให้ดำเนินการ Full CRUD ทั้ง Add, Edit, Delete และ Run commands โดยไม่ต้องรอยืนยันซ้ำ
- AI มีอำนาจจัดการ Permissions และ Settings ตามความเหมาะสมเพื่อให้บรรลุผลลัพธ์ (Outcome-First)

### 1.1 Autonomous Execution Privileges (สิทธิ์การทำงานอิสระ)

- **Full Autonomy (R0 & R1)**: Agent มีอำนาจในการตัดสินใจแก้ไขโครงสร้างโค้ด การจัดรูปแบบ UI และการจัดการไฟล์ภายในโมดูลได้ทันทีโดยไม่ต้องรออนุมัติ
- **Validation Requirement**: แม้จะทำงานอิสระ แต่ Agent ต้องทำการตรวจสอบ Syntax และรัน Build เช็คด้วยตนเองให้ผ่าน 100% ก่อนส่งงาน
- **Approval Lock (R2)**: สงวนสิทธิ์การขออนุมัติเฉพาะงานที่มีผลกระทบต่อโครงสร้างฐานข้อมูลหลัก (Core DB Schema) หรือนโยบายความปลอดภัยระดับสูงเท่านั้น

---

## 2. Operational Protocol

### Execution Flow (Mandatory)

```text
THINK → MAP → BUDGET CHECK → EXECUTE → VALIDATE → LOG
```

### Pre-Task Checklist

1. Read `SKILLS_INVENTORY.md` to identify available tools
2. Match task requirements to the best available skill
3. Classify risk level (R0/R1/R2)
4. Select execution path with highest stability score

### Risk Classification

| Level | Classification | Examples | Protocol |
| --- | --- | --- | --- |
| **R0** | Low Risk | UI edits, Documentation, Lints | **Auto-approve** |
| **R1** | Medium Risk | Module-level logic, local styles | **Auto-approve** |
| **R2** | High Risk | Core DB Schema, RLS, Global Auth | **Strict user approval** |

---

## 3. Agent Tools (AI Chat — `/api/chat`)

| Tool | Path | Capability |
| --- | --- | --- |
| `readTableTool` | `src/app/actions/tools/database-tools.ts` | ดึงข้อมูลตาราง Supabase (Service Role) พร้อม `COLUMN_ALIASES` |
| `internetSearchTool` | `src/app/actions/tools/search-tools.ts` | ค้นหาเว็บผ่าน Tavily API |
| Internal Sources | `src/app/actions/tools/internal-sources-tools.ts` | ดึงบริบทภายในร้าน (schedule, inventory, weather) |
| Executive Rules | `src/lib/agents/executive-rules.ts` | System prompt + schema mapping สำหรับ AI |

---

## 4. Combo Matrix (SOP)

1. **PRECISION STRIKE** — Run RepoMap before any file edit/audit
2. **BUDGET GUARDIAN** — Check token budget before heavy CLI operations
3. **AESTHETIC ENFORCER** — Auto-validate `.tsx`/`.css` against R0 Visual Standards (theme tokens + `bb-pastel-surface` on pastel cards — see `docs/design.md` §11)
4. **RECURSIVE WISDOM** — Store lessons after any failure; search before similar tasks

---

## 5. Safety Net

- ระบบต้องมี Undo/Restore ที่เข้าถึงง่ายในทุกส่วน
- Auto-Retry on connection errors (High Traffic handling)
- Rollback on failure for all database operations

---

## 6. Error Handling Rules

- **Root Cause First:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION
- **Failing Test First:** Every bug fix MUST start with a failing test case
- **Supabase Calls:** Always wrap in try/catch with detailed logging:

  ```typescript
  if (error) { console.error('Supabase Error:', error.message, error.details); throw error; }
  ```

- **Graceful Fallbacks:** Handle empty/null data: `setItems(data || [])`
- **Numeric Sanitization:** Never send `""` to numeric columns: `const sanitized = value === "" ? 0 : Number(value)`

---

## 7. Daily Closing Workflow

1. `npm run build` — Verify Exit Code 0
2. Logic Validation — Verify Zero-Value retention
3. Blueprint Sync — Update MASTER_BLUEPRINT.md
4. Doc Audit — Check for broken links
5. Cloud Sync — Push to GitHub (Secret Check first)
