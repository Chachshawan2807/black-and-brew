# Internal App Screenshot Pack Design Spec

**Date:** 2026-09-19  
**Status:** Draft (pending user review of this file)

## Problem

BLACKANDBREW ERP needs a repeatable way to capture presentation-ready screenshots of major workflows for **internal** stakeholders (team and owners), similar in tone to App Store / Play Store marketing frames, without publishing to store listings.

## Goals

| Goal | Detail |
| ---- | ------ |
| Audience | Internal presentation (not store submission) |
| Coverage | All primary modules plus branch withdrawal |
| Locale / theme | English (`/en/...`), light theme only |
| Deliverables | Mobile: phone frame + short English headline per shot; Desktop: ~1280px width supplemental PNGs (unframed) |
| Data | Realistic production-like data; **anonymize staff names** and redact customer PII on capture |

## Non-goals

- Apple App Store / Google Play exact asset sizes and copy limits
- Thai locale, dark theme, tablet pairs for every module
- Video, PDF slide deck generation (phase 1)
- Mutating Supabase data for capture

## Shot manifest (mobile framed)

Viewport: **390×844** (portrait). Compose export target: **1080×1920** vertical canvas (headline + framed device).

| # | Route | Headline (EN) |
| - | ----- | ------------- |
| 1 | `/en/home` | Daily tasks at a glance |
| 2 | `/en/dashboard` | Live shifts and roster |
| 3 | `/en/schedule` | Drag-and-drop scheduling |
| 4 | `/en/inventory` | Stock spreadsheet, always in sync |
| 5 | `/en/inventory/count` | Cycle counts on the floor |
| 6 | `/en/inventory/accuracy` | Inventory accuracy insights |
| 7 | `/en/inventory/branch-withdraw` | Branch stock withdrawals |
| 8 | `/en/bean-orders` | Bean orders from intake to ship |
| 9 | `/en/bean-orders/new` | Fast order entry |
| 10 | `/en/maintenance` | Equipment maintenance log |
| 11 | `/en/settings` | Theme, alerts, and device trust |
| 12 | (same session) Notification panel open via FAB | Inventory alerts in one place |

**Desktop supplemental (1280×800, unframed):** at minimum `home`, `dashboard`, `schedule`, `inventory`, and **`inventory/branch-withdraw`**.

## Recommended approach

**Hybrid (approach 3):** Playwright captures **raw** PNGs; a separate **compose** step builds framed marketing PNGs from a static HTML template (screenshot via Playwright) or Sharp pipeline. Rationale: repeatable after UI changes; separates app truth from presentation chrome.

Alternatives rejected for phase 1:

- Manual DevTools only: fast once, poor repeatability and manual name redaction.
- Full in-app `screenshot mode` feature flag: heavier product surface for an internal tooling need.

## Capture pipeline

### Environment

- Base URL: `http://localhost:3000` during `npm run dev`, or a Vercel preview with realistic data.
- PIN: read `APP_READ_ONLY_PIN` from env (or `SCREENSHOT_PIN`); never commit secrets.
- Read-only PIN is sufficient for view-only routes; `bean-orders/new` shows empty form without submitting PII.

### Per-shot sequence

1. Set viewport (mobile or desktop).
2. `addInitScript`: `localStorage.setItem('bb-theme', 'light')`.
3. Navigate to `/en/...`.
4. Complete **PinGateway** via UI (enter 6-digit PIN) so cookies, `sessionStorage`, and `ensureSupabaseSession()` align with real usage.
5. Wait for readiness: primary content selector, bounded network idle, single retry on timeout.
6. Run **DOM anonymization** (see below).
7. Optional: open notification panel for shot #12 only.
8. `page.screenshot({ fullPage: false })` for mobile hero framing; desktop may use selective fullPage where helpful.
9. Write raw PNG under `docs/marketing/screenshots/raw/`.
10. Compose mobile raws to `docs/marketing/screenshots/framed/` using manifest headlines.

### Anonymization (DOM only, before screenshot)

Config file: `scripts/screenshots/staff-alias.json`

- Map each real staff name from the roster (see `docs/context.md`) to stable English aliases (`Staff A` through `Staff I`, or user-approved labels).
- Replace text nodes via TreeWalker; update `input`/`textarea` values, `alt`, `title`, `aria-label` where names appear.
- Bean orders: customer name to `Customer ***`, phone patterns masked, address lines redacted; keep statuses and line items where non-identifying.
- No database writes.

Optional post-check: scan PNG filenames list against a denylist of raw staff strings (fail CI if found).

## Compose (framed mobile)

- HTML template: ERP token-friendly background, **font-normal** headline, device frame with `rounded-3xl` aesthetic matching app chrome.
- Headlines driven by `docs/marketing/screenshots/manifest.json` (route, headline, output filenames, capturedAt).
- Desktop raws are **not** framed in phase 1 unless requested later.

## Repository layout

```text
scripts/screenshots/
  capture.mjs          # Playwright runner
  compose.mjs          # Frame + headline
  anonymize.js         # In-browser script injected by capture
  staff-alias.json     # Name map + PII patterns
  template.html        # Compose layout
docs/marketing/screenshots/
  manifest.json
  raw/mobile/
  raw/desktop/
  framed/
```

**Git policy:** default `.gitignore` for `raw/` (may contain pre-redaction mistakes); commit `framed/` only if team wants assets in repo (confirm during implementation).

## npm scripts (implementation target)

```text
npm run screenshots:capture
npm run screenshots:compose
npm run screenshots
```

Add `@playwright/test` (or `playwright`) as devDependency; document one-time `npx playwright install chromium`.

## Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| PIN lockout | Correct read-only PIN from env; no brute force in CI |
| Slow realtime grids | Explicit wait selectors; 60s cap + one retry |
| Leaked name in uncommon UI | Central alias map; extend map when new surfaces found |
| FAB obscures content | Close panel except shot #12 |
| Branch withdraw history shows staff | Same alias pass on history rows |

## Testing

- Smoke: capture script runs locally with `.env.local` and produces 12 mobile + 5 desktop raws without throw.
- Assert manifest JSON lists every route once.
- Optional Vitest: unit test anonymize string replacer with fixture HTML snippet (no browser).

## Implementation handoff

After approval of this spec, create an implementation plan via the **writing-plans** skill (Playwright setup, scripts, manifest, README for presenters).
