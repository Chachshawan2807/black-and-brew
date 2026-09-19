# Internal App Screenshot Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable Playwright capture plus compose scripts that produce internal presentation PNGs (12 framed mobile + 5 desktop raw) for all ERP modules including branch withdraw, with DOM-only staff/PII redaction.

**Architecture:** Node ESM scripts under `scripts/screenshots/` load `manifest.json`, drive Chromium via Playwright (PIN UI login, light theme init script, per-route waits), inject anonymization from `staff-alias.json`, write raws under `docs/marketing/screenshots/raw/`, then a second compose pass renders `template.html` to framed 1080×1920 PNGs. Pure text redaction helpers are Vitest-covered; browser DOM walk lives in one injectable function built from the same alias config.

**Tech Stack:** Node 24, Playwright (`playwright` devDependency), Vitest, existing Next.js dev server on port 3000.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-19-internal-app-screenshots-design.md`
- Locale `en`, theme light (`localStorage` key `bb-theme` = `light`)
- Mobile viewport 390×844; desktop 1280×800; compose canvas 1080×1920
- No em dash (U+2014) in new copy, comments, or docs
- Never commit PINs; read `SCREENSHOT_PIN` or `APP_READ_ONLY_PIN` from env only
- No Supabase mutations from screenshot tooling
- ERP typography: `font-normal` on compose headlines; token-friendly backgrounds (no hardcoded `bg-white` in template)
- Default gitignore `docs/marketing/screenshots/raw/`; framed PNGs optional in git (phase 1: gitignore framed too unless team opts in via empty `.gitkeep` only in `framed/`)

---

### Task 1: Manifest, alias config, gitignore, npm scripts shell

**Files:**
- Create: `docs/marketing/screenshots/manifest.json`
- Create: `scripts/screenshots/staff-alias.json`
- Create: `docs/marketing/screenshots/raw/mobile/.gitkeep`
- Create: `docs/marketing/screenshots/raw/desktop/.gitkeep`
- Create: `docs/marketing/screenshots/framed/.gitkeep`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-09-19-internal-app-screenshots-design.md` (Status → Approved)

**Interfaces:**
- Produces: `manifest.json` shape `{ "mobile": Shot[], "desktop": Shot[] }` where `Shot = { id, route, headline, waitSelector, rawFile }`
- Produces: `staff-alias.json` `{ "staffNames": Record<string,string>, "phonePattern": string, "customerPlaceholder": string }`

- [ ] **Step 1: Add manifest**

Create `docs/marketing/screenshots/manifest.json`:

```json
{
  "mobile": [
    { "id": "01-home", "route": "/en/home", "headline": "Daily tasks at a glance", "waitSelector": "main", "rawFile": "01-home.png" },
    { "id": "02-dashboard", "route": "/en/dashboard", "headline": "Live shifts and roster", "waitSelector": "main", "rawFile": "02-dashboard.png" },
    { "id": "03-schedule", "route": "/en/schedule", "headline": "Drag-and-drop scheduling", "waitSelector": "main", "rawFile": "03-schedule.png" },
    { "id": "04-inventory", "route": "/en/inventory", "headline": "Stock spreadsheet, always in sync", "waitSelector": "table", "rawFile": "04-inventory.png" },
    { "id": "05-inventory-count", "route": "/en/inventory/count", "headline": "Cycle counts on the floor", "waitSelector": "main", "rawFile": "05-inventory-count.png" },
    { "id": "06-inventory-accuracy", "route": "/en/inventory/accuracy", "headline": "Inventory accuracy insights", "waitSelector": "main", "rawFile": "06-inventory-accuracy.png" },
    { "id": "07-branch-withdraw", "route": "/en/inventory/branch-withdraw", "headline": "Branch stock withdrawals", "waitSelector": "main", "rawFile": "07-branch-withdraw.png" },
    { "id": "08-bean-orders", "route": "/en/bean-orders", "headline": "Bean orders from intake to ship", "waitSelector": "main", "rawFile": "08-bean-orders.png" },
    { "id": "09-bean-orders-new", "route": "/en/bean-orders/new", "headline": "Fast order entry", "waitSelector": "main", "rawFile": "09-bean-orders-new.png" },
    { "id": "10-maintenance", "route": "/en/maintenance", "headline": "Equipment maintenance log", "waitSelector": "main", "rawFile": "10-maintenance.png" },
    { "id": "11-settings", "route": "/en/settings", "headline": "Theme, alerts, and device trust", "waitSelector": "main", "rawFile": "11-settings.png" },
    { "id": "12-notifications", "route": "/en/inventory", "headline": "Inventory alerts in one place", "waitSelector": "table", "rawFile": "12-notifications.png", "openNotificationPanel": true }
  ],
  "desktop": [
    { "id": "d-home", "route": "/en/home", "headline": "Daily tasks at a glance", "waitSelector": "main", "rawFile": "d-home.png" },
    { "id": "d-dashboard", "route": "/en/dashboard", "headline": "Live shifts and roster", "waitSelector": "main", "rawFile": "d-dashboard.png" },
    { "id": "d-schedule", "route": "/en/schedule", "headline": "Drag-and-drop scheduling", "waitSelector": "main", "rawFile": "d-schedule.png" },
    { "id": "d-inventory", "route": "/en/inventory", "headline": "Stock spreadsheet, always in sync", "waitSelector": "table", "rawFile": "d-inventory.png" },
    { "id": "d-branch-withdraw", "route": "/en/inventory/branch-withdraw", "headline": "Branch stock withdrawals", "waitSelector": "main", "rawFile": "d-branch-withdraw.png" }
  ]
}
```

- [ ] **Step 2: Add staff alias config**

Create `scripts/screenshots/staff-alias.json`:

```json
{
  "staffNames": {
    "นิต้า": "Staff A",
    "ปิ่น": "Staff B",
    "มุก": "Staff C",
    "เม": "Staff D",
    "มีนา": "Staff E",
    "ชัช": "Staff F",
    "หนูดี": "Staff G",
    "ฟิว": "Staff H",
    "ล่า": "Staff I"
  },
  "customerPlaceholder": "Customer ***",
  "phonePattern": "0[0-9]{1,2}[-\\s]?[0-9]{3}[-\\s]?[0-9]{4}"
}
```

- [ ] **Step 3: Gitignore raw and framed PNGs**

Append to `.gitignore`:

```gitignore
# Marketing screenshots (regenerate via npm run screenshots)
docs/marketing/screenshots/raw/**/*.png
docs/marketing/screenshots/framed/**/*.png
```

Keep `.gitkeep` files tracked.

- [ ] **Step 4: Add devDependency and script placeholders**

In `package.json` `devDependencies` add `"playwright": "^1.55.0"` (or latest 1.x compatible with Node 24).

In `scripts` add:

```json
"screenshots:capture": "node scripts/screenshots/capture.mjs",
"screenshots:compose": "node scripts/screenshots/compose.mjs",
"screenshots": "npm run screenshots:capture && npm run screenshots:compose"
```

- [ ] **Step 5: Mark spec approved**

In `docs/superpowers/specs/2026-09-19-internal-app-screenshots-design.md` set `**Status:** Approved`.

- [ ] **Step 6: Commit**

```powershell
git add docs/marketing/screenshots/manifest.json scripts/screenshots/staff-alias.json docs/marketing/screenshots/raw/mobile/.gitkeep docs/marketing/screenshots/raw/desktop/.gitkeep docs/marketing/screenshots/framed/.gitkeep .gitignore package.json docs/superpowers/specs/2026-09-19-internal-app-screenshots-design.md
git commit -m "chore: scaffold internal screenshot manifest and npm scripts"
```

Run: `npm install`

Expected: lockfile updates; no runtime errors.

---

### Task 2: Pure redaction helpers + Vitest

**Files:**
- Create: `scripts/screenshots/redact-text.ts`
- Create: `src/test/screenshot-redact-text.test.ts`

**Interfaces:**
- Produces:
  - `export type StaffAliasConfig = { staffNames: Record<string, string>; customerPlaceholder: string; phonePattern: string }`
  - `export function applyStaffAliases(text: string, staffNames: Record<string, string>): string`
  - `export function redactPhones(text: string, phonePattern: string): string`
  - `export function redactDisplayText(text: string, config: StaffAliasConfig): string`

- [ ] **Step 1: Write the failing test**

Create `src/test/screenshot-redact-text.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import {
  applyStaffAliases,
  redactPhones,
  redactDisplayText,
  type StaffAliasConfig,
} from '../../scripts/screenshots/redact-text';

const config: StaffAliasConfig = {
  staffNames: { ชัช: 'Staff F', นิต้า: 'Staff A' },
  customerPlaceholder: 'Customer ***',
  phonePattern: '0[0-9]{1,2}[-\\s]?[0-9]{3}[-\\s]?[0-9]{4}',
};

describe('applyStaffAliases', () => {
  test('replaces longest names first without partial leaks', () => {
    expect(applyStaffAliases('ชัช and นิต้า', config.staffNames)).toBe('Staff F and Staff A');
  });
});

describe('redactPhones', () => {
  test('masks Thai mobile patterns', () => {
    expect(redactPhones('call 081-234-5678', config.phonePattern)).toBe('call ***-***-****');
  });
});

describe('redactDisplayText', () => {
  test('applies staff then phone', () => {
    expect(redactDisplayText('ชัช 0812345678', config)).toBe('Staff F ***-***-****');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/screenshot-redact-text.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement minimal helpers**

Create `scripts/screenshots/redact-text.ts`:

```typescript
export type StaffAliasConfig = {
  staffNames: Record<string, string>;
  customerPlaceholder: string;
  phonePattern: string;
};

export function applyStaffAliases(text: string, staffNames: Record<string, string>): string {
  let out = text;
  const entries = Object.entries(staffNames).sort((a, b) => b[0].length - a[0].length);
  for (const [real, alias] of entries) {
    out = out.split(real).join(alias);
  }
  return out;
}

export function redactPhones(text: string, phonePattern: string): string {
  const re = new RegExp(phonePattern, 'g');
  return text.replace(re, '***-***-****');
}

export function redactDisplayText(text: string, config: StaffAliasConfig): string {
  const withStaff = applyStaffAliases(text, config.staffNames);
  return redactPhones(withStaff, config.phonePattern);
}
```

Ensure `tsconfig.json` includes `scripts/screenshots/**/*.ts` or that Vitest resolves the relative import (same pattern as other tests importing from `scripts/` if any; otherwise add `scripts` to `include` in `tsconfig.json` only if TypeScript errors).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/test/screenshot-redact-text.test.ts`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```powershell
git add scripts/screenshots/redact-text.ts src/test/screenshot-redact-text.test.ts
git commit -m "test: add screenshot text redaction helpers"
```

---

### Task 3: Manifest validation test

**Files:**
- Create: `src/test/screenshot-manifest.test.ts`

**Interfaces:**
- Consumes: `docs/marketing/screenshots/manifest.json`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, test } from 'vitest';
import manifest from '../../docs/marketing/screenshots/manifest.json';

describe('screenshot manifest', () => {
  test('mobile routes are unique and include branch withdraw', () => {
    const routes = manifest.mobile.map((s) => s.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toContain('/en/inventory/branch-withdraw');
    expect(manifest.mobile).toHaveLength(12);
  });

  test('desktop includes branch withdraw', () => {
    expect(manifest.desktop.map((s) => s.route)).toContain('/en/inventory/branch-withdraw');
    expect(manifest.desktop).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm run test -- src/test/screenshot-manifest.test.ts`

Expected: PASS

- [ ] **Step 3: Commit**

```powershell
git add src/test/screenshot-manifest.test.ts
git commit -m "test: lock screenshot manifest routes"
```

---

### Task 4: Playwright capture script

**Files:**
- Create: `scripts/screenshots/capture.mjs`
- Create: `scripts/screenshots/dom-anonymize.mjs`
- Create: `scripts/screenshots/paths.mjs`

**Interfaces:**
- Consumes: `redactDisplayText` logic duplicated in browser via `dom-anonymize.mjs` (string built from `staff-alias.json`, must stay in sync with Task 2 rules: longest-first staff replace, phone regex)
- Consumes: env `SCREENSHOT_BASE_URL` (default `http://127.0.0.1:3000`), `SCREENSHOT_PIN` or `APP_READ_ONLY_PIN`
- Produces: PNG files under `docs/marketing/screenshots/raw/mobile/` and `raw/desktop/`; updates `manifest.json` `capturedAt` ISO field per shot (optional top-level `lastCapture` string)

- [ ] **Step 1: Create paths helper**

`scripts/screenshots/paths.mjs`:

```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REPO_ROOT = root;
export const MANIFEST_PATH = path.join(root, 'docs/marketing/screenshots/manifest.json');
export const RAW_MOBILE = path.join(root, 'docs/marketing/screenshots/raw/mobile');
export const RAW_DESKTOP = path.join(root, 'docs/marketing/screenshots/raw/desktop');
export const STAFF_ALIAS_PATH = path.join(root, 'scripts/screenshots/staff-alias.json');
```

- [ ] **Step 2: Create DOM anonymize builder**

`scripts/screenshots/dom-anonymize.mjs` exports `buildAnonymizeFunction(aliasConfig)` returning a function serializable for `page.evaluate`:

```javascript
export function buildAnonymizeFunction(aliasConfig) {
  const { staffNames, phonePattern, customerPlaceholder } = aliasConfig;
  const entries = Object.entries(staffNames).sort((a, b) => b[0].length - a[0].length);

  return function anonymizeDom() {
    const redact = (text) => {
      if (!text) return text;
      let out = text;
      for (const [real, alias] of entries) {
        out = out.split(real).join(alias);
      }
      try {
        const re = new RegExp(phonePattern, 'g');
        out = out.replace(re, '***-***-****');
      } catch {
        /* ignore bad pattern */
      }
      return out;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const next = redact(node.textContent ?? '');
      if (next !== node.textContent) node.textContent = next;
    }

    document.querySelectorAll('input, textarea').forEach((el) => {
      if ('value' in el && typeof el.value === 'string') {
        el.value = redact(el.value);
      }
    });

    for (const attr of ['aria-label', 'title', 'alt', 'placeholder']) {
      document.querySelectorAll(`[${attr}]`).forEach((el) => {
        const v = el.getAttribute(attr);
        if (v) el.setAttribute(attr, redact(v));
      });
    }

    document.querySelectorAll('[data-customer-name]').forEach((el) => {
      el.textContent = customerPlaceholder;
    });
  };
}
```

- [ ] **Step 3: Implement capture.mjs**

Core behaviors:

```javascript
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { buildAnonymizeFunction } from './dom-anonymize.mjs';
import { MANIFEST_PATH, RAW_MOBILE, RAW_DESKTOP, STAFF_ALIAS_PATH, REPO_ROOT } from './paths.mjs';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3000';
const PIN = process.env.SCREENSHOT_PIN ?? process.env.APP_READ_ONLY_PIN;
if (!PIN || PIN.length !== 6) {
  console.error('Set SCREENSHOT_PIN or APP_READ_ONLY_PIN (6 digits) in the environment.');
  process.exit(1);
}

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function ensurePinGateway(page) {
  const pinInput = page.locator('#bb-pin-gateway');
  if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pinInput.fill(PIN);
    await page.waitForSelector('[data-testid="pin-digit-boxes"]', { state: 'visible' });
    await page.waitForFunction(
      () => !document.querySelector('#bb-pin-gateway') || document.querySelector('#bb-pin-gateway')?.closest('form') === null || !document.body.innerText.includes('Enter your 6-digit PIN'),
      { timeout: 60000 },
    ).catch(async () => {
      await page.waitForSelector('main', { timeout: 60000 });
    });
  }
}

async function captureShot(page, shot, outDir, viewport, aliasConfig) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${shot.route}`, { waitUntil: 'domcontentloaded' });
  await ensurePinGateway(page);
  await page.waitForSelector(shot.waitSelector, { timeout: 60000 });
  await page.waitForTimeout(800);

  if (shot.openNotificationPanel) {
    const bell = page.getByRole('button', { name: /การแจ้งเตือน|notification/i });
    await bell.click({ timeout: 15000 });
    await page.waitForTimeout(500);
  }

  const fn = buildAnonymizeFunction(aliasConfig);
  await page.evaluate(fn);

  const outPath = `${outDir}/${shot.rawFile}`;
  await page.screenshot({ path: outPath, fullPage: false });
  return outPath;
}

async function main() {
  const manifest = await loadJson(MANIFEST_PATH);
  const aliasConfig = await loadJson(STAFF_ALIAS_PATH);
  await fs.mkdir(RAW_MOBILE, { recursive: true });
  await fs.mkdir(RAW_DESKTOP, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('bb-theme', 'light');
  });
  const page = await context.newPage();

  const mobileVp = { width: 390, height: 844 };
  for (const shot of manifest.mobile) {
    console.log('mobile', shot.id);
    await captureShot(page, shot, RAW_MOBILE, mobileVp, aliasConfig);
  }

  const desktopVp = { width: 1280, height: 800 };
  for (const shot of manifest.desktop) {
    console.log('desktop', shot.id);
    await captureShot(page, shot, RAW_DESKTOP, desktopVp, aliasConfig);
  }

  manifest.lastCapture = new Date().toISOString();
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Refine `ensurePinGateway` during implementation: after `fill(PIN)`, wait for `main` visible and pin overlay hidden (check absence of `#bb-pin-gateway` in front or use `page.getByText('Sign in').waitFor({ state: 'hidden' })`).

- [ ] **Step 4: Install browser**

Run: `npx playwright install chromium`

- [ ] **Step 5: Manual smoke (document in README later)**

Terminal A: `npm run dev`

Terminal B: load env from `.env.local` then:

```powershell
$env:SCREENSHOT_PIN = "111222"
npm run screenshots:capture
```

Expected: 12 files in `raw/mobile/`, 5 in `raw/desktop/`; no thrown errors.

- [ ] **Step 6: Commit**

```powershell
git add scripts/screenshots/capture.mjs scripts/screenshots/dom-anonymize.mjs scripts/screenshots/paths.mjs
git commit -m "feat: Playwright screenshot capture with DOM anonymize"
```

---

### Task 5: Compose framed mobile PNGs

**Files:**
- Create: `scripts/screenshots/template.html`
- Create: `scripts/screenshots/compose.mjs`

**Interfaces:**
- Consumes: `manifest.mobile`, files in `RAW_MOBILE`
- Produces: `docs/marketing/screenshots/framed/{id}.png` (1080×1920)

- [ ] **Step 1: Create template.html**

Static HTML with placeholders `{{HEADLINE}}` and `{{SCREENSHOT_DATA_URL}}` or file path injected at runtime. Style:

- Canvas 1080×1920, background `#f5f0e8` (Morning Latte adjacent) or CSS variable comment linking to ERP token
- Headline top: 48px, font-weight 400, color `#1a1a1a`, max-width 920px, centered
- Phone frame: inner screenshot width ~920px, border-radius 24px, subtle shadow
- `font-family: system-ui, sans-serif`

- [ ] **Step 2: Implement compose.mjs**

```javascript
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { MANIFEST_PATH, RAW_MOBILE, REPO_ROOT } from './paths.mjs';

const FRAMED_DIR = path.join(REPO_ROOT, 'docs/marketing/screenshots/framed');
const TEMPLATE_PATH = path.join(REPO_ROOT, 'scripts/screenshots/template.html');

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  await fs.mkdir(FRAMED_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1920 });

  for (const shot of manifest.mobile) {
    const rawPath = path.join(RAW_MOBILE, shot.rawFile);
    const buf = await fs.readFile(rawPath);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    const html = template
      .replace('{{HEADLINE}}', shot.headline)
      .replace('{{SCREENSHOT_DATA_URL}}', dataUrl);
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({
      path: path.join(FRAMED_DIR, `${shot.id}.png`),
      fullPage: false,
    });
    console.log('framed', shot.id);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run compose after capture**

Run: `npm run screenshots:compose`

Expected: 12 PNGs in `framed/`

- [ ] **Step 4: Commit**

```powershell
git add scripts/screenshots/template.html scripts/screenshots/compose.mjs
git commit -m "feat: compose framed mobile screenshot assets"
```

---

### Task 6: Presenter README + denylist check script

**Files:**
- Create: `docs/marketing/screenshots/README.md`
- Create: `scripts/screenshots/verify-no-staff-leak.mjs`

**Interfaces:**
- `verify-no-staff-leak.mjs` reads `staff-alias.json` keys (real names) and scans all PNGs in raw+framed as binary for UTF-8 strings (simple buffer includes check); exit 1 if any real staff name found

- [ ] **Step 1: Write README**

Include:

- Prerequisites: `npm run dev`, `.env.local` with read-only PIN, `npx playwright install chromium`
- Commands: `npm run screenshots`, individual capture/compose
- Output folders and which to share internally (recommend `framed/` only)
- Re-run after UI changes; update `waitSelector` in manifest if a page layout changes
- Privacy note: always run verify script before sharing

- [ ] **Step 2: Implement verify script**

Loop real names from `staffNames` keys; if `buffer.includes(Buffer.from(name, 'utf8'))` then print path and exit 1. Note: PNG compression may false-negative; still useful as guard. Document limitation in README.

- [ ] **Step 3: Add npm script**

```json
"screenshots:verify": "node scripts/screenshots/verify-no-staff-leak.mjs"
```

- [ ] **Step 4: Run verify after full pipeline**

Run: `npm run screenshots:verify`

Expected: exit 0 if redaction worked

- [ ] **Step 5: Commit**

```powershell
git add docs/marketing/screenshots/README.md scripts/screenshots/verify-no-staff-leak.mjs package.json
git commit -m "docs: screenshot capture runbook and leak verify script"
```

---

### Task 7: Optional data-testid for notification panel (only if capture flaky)

**Files:**
- Modify: `src/components/notifications/NotificationPanel.tsx` (only if Task 4 smoke fails to detect open panel)

**Interfaces:**
- Add `data-testid="notification-panel"` on panel root dialog/section

- [ ] **Step 1: Re-run capture for shot 12**

If panel not visible, add testid and wait `page.getByTestId('notification-panel')` in `capture.mjs`.

- [ ] **Step 2: Commit only if changed**

```powershell
git commit -m "a11y: notification panel test id for screenshot tooling"
```

---

## Plan self-review (completed)

| Spec requirement | Task |
| ---------------- | ---- |
| 12 mobile routes incl. branch withdraw | Task 1 manifest, Task 3 test |
| 5 desktop incl. branch withdraw | Task 1, Task 3 |
| en + light | Task 4 init script + `/en` routes |
| DOM anonymize staff + PII | Task 2, Task 4 |
| Framed compose 1080×1920 | Task 5 |
| npm scripts | Task 1, Task 6 |
| Playwright devDependency | Task 1 |
| README / smoke | Task 4 step 5, Task 6 |
| No DB mutation | Capture design (evaluate only) |
| Optional leak scan | Task 6 |

No TBD placeholders in task steps; PIN wait logic may need tuning during Task 4 smoke (concrete selectors listed).

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-09-19-internal-app-screenshots.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** - Implement tasks in this chat with checkpoints between tasks  

Which approach do you want?
