# Plan: Fix Schedule Date Routing & Profile Mapping

## Goal

Implement a bug fix for schedule date routing and profile mapping in the chat agent, and resolve date-related unit test failures.

## Tech Stack & Architecture

- Next.js 16 App Router
- Vercel AI SDK v6
- Supabase Client
- Vitest

## Tasks

### Task 1: Refactor Daily Report Server Actions for Lazy initialization

- Modify [daily-report-actions.ts](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/app/actions/daily-report-actions.ts) to lazily initialize the `supabaseAdmin` client.
- Change date format to `dd-MM-yyyy` using dashes instead of slashes.

### Task 2: Update internal-sources-tools.ts

- Modify [internal-sources-tools.ts](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/app/actions/tools/internal-sources-tools.ts) to accept optional `date` input parameter.
- Use `parameters` schema instead of `inputSchema`.

### Task 3: Update Chat API Route Handler

- Modify [route.ts](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/app/api/chat/route.ts) to route schedule queries to `getDailyReportSourcesTool`.

### Task 4: Fix Time Dependencies in Tests

- Modify [daily_report_actions.test.ts](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/test/daily_report_actions.test.ts) to mock the system time.

### Task 5: Verify Changes

- Run `npm run test`
- Run `npm run build`
