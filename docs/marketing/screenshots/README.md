# Internal screenshot pack

Presentation PNGs for BLACKANDBREW ERP (light theme; **English headlines** on framed PNGs). UI capture uses **`/th/` routes** because `src/proxy.ts` redirects `/en/*` to Thai paths. This tooling **does not change app behavior**; it only drives a browser against a running dev or preview URL.

## Prerequisites

1. App running: `npm run dev` (default `http://127.0.0.1:3000`)
2. `.env.local` with **`APP_PIN`** (recommended) or set `SCREENSHOT_PIN`. Read-only PIN makes many pages look faded (`opacity-60`).
3. One-time browser install: `npx playwright install chromium`

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run screenshots:capture` | Raw mobile (390×844 **viewport**, like a phone screenshot) and desktop (**1440×900** with sidebar) PNGs |
| `npm run screenshots:compose` | Framed mobile PNGs (1080px wide) with English headlines |
| `npm run screenshots` | Capture then compose |
| `npm run screenshots:verify` | Fail if real staff names appear in PNG bytes (best-effort) |

Use **`http://localhost:3000`** (default). Avoid `127.0.0.1` with Next dev; client hydration may not run.

Optional: `SCREENSHOT_BASE_URL=https://your-preview.vercel.app`

Re-run after a partial failure: existing PNGs are skipped unless `SCREENSHOT_FORCE=1`.

Single shot (e.g. notifications only): `SCREENSHOT_ONLY=11-notifications SCREENSHOT_FORCE=1 npm run screenshots:capture`

## Output

| Folder | Contents |
| ------ | -------- |
| `raw/mobile/` | Unframed phone screenshots (gitignored) |
| `raw/desktop/` | Unframed desktop screenshots (gitignored) |
| `framed/` | Shareable slides for internal demos (gitignored by default) |

Routes and headlines: `manifest.json`. Staff name aliases: `scripts/screenshots/staff-alias.json`.

## Privacy

Before sharing PNGs externally, run `npm run screenshots:verify`. DOM anonymization runs **only in the browser session** during capture; it does not write to Supabase.

**Redaction scope:** `redactMode` in `manifest.json` is `staff` only on home, dashboard, and schedule (mobile + matching desktop). All other routes use `none`. Single-character staff names are never replaced inside longer words (e.g. product names).

**Dev server:** Next.js "Rendering..." badge is hidden during capture via injected CSS (capture tooling only).

## Troubleshooting

- **PIN overlay stuck:** Confirm 6-digit read-only PIN; avoid repeated wrong attempts (lockout).
- **Timeout on a page:** Increase wait or adjust `waitSelector` in `manifest.json` for that route only.
- **Branch withdraw (#07):** Inner scroll region is scrolled to the bottom before capture so withdrawal history in the scroll body appears in the viewport.
- **Notification shot (#11):** Waits for hub catch-up first, then falls back to formatted seed (same formatters as the FAB hub, via `format-catch-up-notifications.ts`). Optional override: `notification-list.seed.json`.
- **Mobile #10:** `10-settings` is Settings (sidebar footer), not maintenance. Maintenance is only `09-maintenance`.
- **Dashboard dates:** Shots `02-dashboard` / `d-dashboard` use `26/08/2026`–`25/09/2026` via `manifest.json` → `dashboardScreenshotRange`.
- **Passkey enroll dialog:** Capture clicks **Skip for now** automatically when shown.
