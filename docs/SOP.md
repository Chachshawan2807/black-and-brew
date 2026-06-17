# BLACKANDBREW Standard Operating Procedure (SOP)

This document outlines the core technical standards for developing and maintaining the BLACKANDBREW ERP system. These standards are derived from the Superpowers framework and adapted for our specific architecture.

## 1. Test-Driven Development (Standard: `tdd`)

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

- **Cycle:**
  1. **RED:** Write a minimal failing test for the specific behavior.
  2. **Verify RED:** Run the test and watch it fail for the expected reason.
  3. **GREEN:** Write the minimal code needed to make the test pass.
  4. **Verify GREEN:** Run the test and watch it pass.
  5. **REFACTOR:** Clean up the code while keeping the tests green.
- **Exception:** Only for throwaway prototypes or pure configuration files, with user approval.
- **Rule:** If code was written before the test, delete it and start over.

## 2. Systematic Debugging (Standard: `debugging`)

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

- **Phase 1: Root Cause:**
  - Read error messages completely.
  - Reproduce the bug consistently.
  - Trace data flow (where does the bad value originate?).
- **Phase 2: Pattern Analysis:**
  - Compare broken code with working examples in the codebase.
- **Phase 3: Hypothesis:**
  - Form a specific theory: "X is failing because Y".
  - Test the hypothesis with the smallest possible change.
- **Phase 4: Implementation:**
  - Create a failing test case first (TDD).
  - Implement single fix.
  - Verify fix and ensure no regressions.
- **The "Rule of 3":** If 3 fixes have failed, stop and question the architecture. Discuss with the human partner before attempt #4.

---

## 3. Daily Closing Integrity Workflow (Standard: `daily-closing`)

**Required at the end of every development session.**

1. **Integrity Build**: Run `npm run build` to verify system readiness and type safety.
2. **Logic Validation**: Verify core persistence rules (e.g., Zero-Value retention) via automated tests.
3. **Blueprint Sync**: Update `MASTER_BLUEPRINT.md` and `PROTOCOL_ENFORCER.md` with the latest feature states.
4. **Doc Audit**: Review all `.md` files for broken links and outdated instructions.
5. **Cloud Sync**: Securely push code to GitHub with clear commit messages.

---
*Follow these rules to ensure the stability and premium quality of the BLACKANDBREW ERP.*
