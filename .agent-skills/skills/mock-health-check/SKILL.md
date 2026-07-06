---
name: mock-health-check
description: Smoke-check lint and a fast unit test to verify AgentSkillOS skill runner works
user-invocable: true
---

# Mock Health Check

## When to use

- After setting up or changing `.agent-skills/` infrastructure
- Before claiming AgentSkillOS integration is working
- As a minimal CI smoke target

## Run (terminal)

```bash
npm run skill:run mock-health-check
```

## What it does

1. Runs ESLint (`npm run lint`)
2. Runs one fast Vitest file (`src/test/daily_report_summary.test.ts`)

## Notes

- Exit code 0 prints `OK: mock-health-check passed`
- Process Integrity verification skill for the AgentSkillOS runner
