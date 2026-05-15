# Agent Guidelines — BLACKANDBREW ERP

> **Version:** 3.1 | **Last Updated:** 2026-05-15

---

## 1. AI Autonomy Level

### Full Permission Mode (100% AI Control)

- AI ได้รับอนุญาตให้ดำเนินการ Full CRUD ทั้ง Add, Edit, Delete และ Run commands โดยไม่ต้องรอยืนยันซ้ำ
- AI มีอำนาจจัดการ Permissions และ Settings ตามความเหมาะสมเพื่อให้บรรลุผลลัพธ์ (Outcome-First)

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
| :--- | :--- | :--- | :--- |
| **R0** | Low Risk | UI edits, Documentation, Lints | Auto-approve |
| **R1** | Medium Risk | DB mutations, API keys | Context verification |
| **R2** | High Risk | Prod deployment, RLS changes, Deletion | Strict user approval |

---

## 3. Agent Tools

| Tool | Path | Capability |
| :--- | :--- | :--- |
| FS Tool | `src/lib/agent-tools/fs_tool.ts` | Zod-validated filesystem CRUD |
| Shell Tool | `src/lib/agent-tools/shell_tool.ts` | Secure `child_process` execution |
| Search Proxy | `src/lib/agent-tools/search_proxy.ts` | Unified code/docs/web search |

---

## 4. Combo Matrix (SOP)

1. **PRECISION STRIKE** — Run RepoMap before any file edit/audit
2. **BUDGET GUARDIAN** — Check token budget before heavy CLI operations
3. **AESTHETIC ENFORCER** — Auto-validate `.tsx`/`.css` against R0 Visual Standards
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
