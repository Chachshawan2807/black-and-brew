<!-- markdownlint-disable MD025 -->
# Agent Rules — BLACKANDBREW ERP

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-ux-pro-max-skill -->

## UI/UX PRO MAX STANDARDS

- **Import Skill:** <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git>
- **Constraint:** ทุกการสร้าง UI ใน BLACKANDBREW ERP ต้องเป็น Minimalist และใช้ Pastel Palette ตามเงื่อนไขเวลาเดิมเท่านั้น (เช่น 6:30 = light green)
- **Design Logic:** เน้นผลลัพธ์ที่ถูกต้องเชิงระบบ (Outcome-First) และความสมมาตรของข้อมูล
<!-- END:ui-ux-pro-max-skill -->
<!-- BEGIN:clickable-input-rules -->

## GLOBAL UI INTERACTION RULES

- **Date Picker Accessibility:** สำหรับ Input ประเภทวันที่ (Date Picker) ทั้งหมดในโปรเจกต์ ต้องทำให้พื้นที่ทั้งหมดของ Input Container สามารถคลิกเพื่อเรียกปฏิทินขึ้นมาได้ (Full-width clickable area) ไม่จำกัดเฉพาะการคลิกที่ไอคอน
- **Implementation Style:** ใช้สไตล์การเขียนแบบ Shared Component หรือ Tailwind Utility ที่ขยาย Hitbox ให้ครอบคลุมทั้งกรอบ Input เพื่อให้พนักงานใช้งานได้สะดวกบนทุกอุปกรณ์
<!-- END:clickable-input-rules -->

<!-- BEGIN:data-sync-standard -->

## DATA SYNCHRONIZATION STANDARD

- **Database Rules:** Any data changes (Add, Update, Delete) connected to Supabase must trigger an immediate, automatic update to the database and reflect in the UI state without manual refresh.
- **Optimistic UI:** Always update the local state using functional updates (`setProfiles(prev => [...prev, newProfile])`) immediately after a successful database response or simultaneously if the risk of failure is low, ensuring the UI remains responsive.

<!-- BEGIN:spreadsheet-ui-maintenance -->

## SPREADSHEET-STYLE UI MAINTENANCE (Editable Grid)

- **Direct Cell Editing:** Do not use modals or "Edit" buttons for simple grids (e.g., Inventory). Use native `<input>` tags rendered directly in `<td>` elements.
- **Auto-Save:** Inputs must use `onChange` for instant local state reflection and `onBlur`/`onKeyDown={Enter}` for firing background `.update()` calls to Supabase.
- **No Action Columns:** Action columns (like "Delete") should be avoided or completely removed in spreadsheet modes to maximize horizontal space. To delete, users might clear the row or use a separate bulk-action tool, unless explicitly requested otherwise.
<!-- END:spreadsheet-ui-maintenance -->

<!-- BEGIN:error-handling-standard -->

## ERROR HANDLING & SYSTEMATIC DEBUGGING STANDARD

- **Root Cause First:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION. Follow `systematic-debugging` phases (Phase 1: Root Cause -> Phase 2: Pattern -> Phase 3: Hypothesis -> Phase 4: Fix).
- **Failing Test First:** Every bug fix MUST start with a failing test case that reproduces the issue.
- **Supabase Fetches & Mutations:** Always wrap Supabase calls in try/catch blocks.
- **Detailed Logging:** In the catch block or when `error` is returned from Supabase, you must log the precise details: `if (error) { console.error('Supabase Error:', error.message, error.details); throw error; }`.
- **Graceful Fallbacks:** Handle empty or null data gracefully (e.g., `setItems(data || [])`). Do not allow the UI to crash if data is missing.
- **Numeric Data Sanitization:** Never send an empty string `""` to a `numeric` or `integer` column in Supabase. Always sanitize inputs: `const sanitized = value === "" ? 0 : Number(value)`.
- **Numeric Formatting & Undo-Sync Standard:**
  - Always strip leading zeros from integer inputs using `replace(/^0+(?=\d)/, '')`.
  - If current value is 0 and user types 1-9, replace the 0 with that digit.
  - **1-Click Undo Persistence Standard:** Capture state on focus or before any update to ensure undo works in a single click. Always `await syncFullStateToDB` in undo/redo.
- **Zero-Display UI Logic:** Numeric values of 0 must be rendered as empty strings `""` for a cleaner UI, while maintaining 0 in the database.
<!-- END:error-handling-standard -->
<!-- END:data-sync-standard -->

<!-- BEGIN:superpowers-sop -->

## CORE DEVELOPMENT SOP (Superpowers)

- **Writing Plans:** Use the `writing-plans` skill for any task with >3 steps. Save to `docs/plans/`. No placeholders.
- **TDD (Test-Driven Development):** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Follow Red-Green-Refactor religiously.
- **Verification:** Always verify "RED" (test fails) and "GREEN" (test passes) before proceeding.
- **Documentation Reference:** Full SOP details are available in [SOP.md](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/docs/SOP.md).
<!-- END:superpowers-sop -->
