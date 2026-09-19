# Internal screenshot pack

Presentation PNGs for BLACKANDBREW ERP (English, light theme). This tooling **does not change app behavior**; it only drives a browser against a running dev or preview URL.

## Prerequisites

1. App running: `npm run dev` (default `http://127.0.0.1:3000`)
2. `.env.local` with a valid **read-only** PIN (`APP_READ_ONLY_PIN`) or set `SCREENSHOT_PIN` for the session
3. One-time browser install: `npx playwright install chromium`

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run screenshots:capture` | Raw mobile (390×844) and desktop (1280×800) PNGs |
| `npm run screenshots:compose` | Framed mobile 1080×1920 PNGs with headlines |
| `npm run screenshots` | Capture then compose |
| `npm run screenshots:verify` | Fail if real staff names appear in PNG bytes (best-effort) |

Optional: `SCREENSHOT_BASE_URL=https://your-preview.vercel.app`

## Output

| Folder | Contents |
| ------ | -------- |
| `raw/mobile/` | Unframed phone screenshots (gitignored) |
| `raw/desktop/` | Unframed desktop screenshots (gitignored) |
| `framed/` | Shareable slides for internal demos (gitignored by default) |

Routes and headlines: `manifest.json`. Staff name aliases: `scripts/screenshots/staff-alias.json`.

## Privacy

Before sharing PNGs externally, run `npm run screenshots:verify`. DOM anonymization runs **only in the browser session** during capture; it does not write to Supabase.

## Troubleshooting

- **PIN overlay stuck:** Confirm 6-digit read-only PIN; avoid repeated wrong attempts (lockout).
- **Timeout on a page:** Increase wait or adjust `waitSelector` in `manifest.json` for that route only.
- **Notification shot (#12):** FAB loads after idle; re-run capture if the bell was not visible.
- **Passkey enroll dialog:** Capture clicks **Skip for now** automatically when shown.
