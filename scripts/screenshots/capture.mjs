import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { runDomAnonymize } from './dom-anonymize.mjs';
import { hideDevOverlays } from './hide-dev-ui.mjs';
import { resolveScreenshotPin } from './load-env-pin.mjs';
import { resolveNotificationSeedJson } from './notification-seed.mjs';
import {
  MANIFEST_PATH,
  RAW_DESKTOP,
  RAW_MOBILE,
  STAFF_ALIAS_PATH,
} from './paths.mjs';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';

function baseHostname() {
  return new URL(BASE).hostname;
}

async function applyDashboardScreenshotRange(context, page, range) {
  const host = baseHostname();
  await context.addCookies([
    {
      name: 'dashboard_start_date',
      value: range.start,
      domain: host,
      path: '/',
      sameSite: 'Lax',
    },
    {
      name: 'dashboard_end_date',
      value: range.end,
      domain: host,
      path: '/',
      sameSite: 'Lax',
    },
    {
      name: 'dashboard_roster_start_date',
      value: range.start,
      domain: host,
      path: '/',
      sameSite: 'Lax',
    },
    {
      name: 'dashboard_roster_end_date',
      value: range.end,
      domain: host,
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

async function persistDashboardRangeInPage(page, range) {
  await page.evaluate(({ start, end }) => {
    localStorage.setItem('bb-dashboard-weekly-start-date', start);
    localStorage.setItem('bb-dashboard-weekly-end-date', end);
    localStorage.setItem('bb-dashboard-roster-start-date', start);
    localStorage.setItem('bb-dashboard-roster-end-date', end);
  }, range);
}

function routeWithDashboardQuery(route, range) {
  const url = new URL(route, BASE);
  url.searchParams.set('start', range.start);
  url.searchParams.set('end', range.end);
  return `${url.pathname}${url.search}`;
}

async function waitForNotificationPanelPopulated(page) {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 15000 });

  const hasRows = () =>
    dialog.locator('section h3').first().isVisible().catch(() => false);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await hasRows()) {
      await waitForStableFrame(page);
      return;
    }
    await page.waitForTimeout(750);
  }

  throw new Error(
    'Notification panel stayed empty after catch-up. Use APP_PIN against an environment whose data_change_logs has notification rows.',
  );
}

async function openNotificationPanelWithRetry(page) {
  const bell = page.getByRole('button', { name: /การแจ้งเตือน|notification/i }).last();
  await bell.waitFor({ state: 'visible', timeout: 45000 });
  await bell.scrollIntoViewIfNeeded();

  for (let attempt = 0; attempt < 3; attempt++) {
    await bell.click({ force: true });
    const dialog = page.getByRole('dialog');
    const opened = await dialog.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    if (!opened) {
      await page.waitForTimeout(2000);
      continue;
    }
    if (await dialog.locator('section h3').first().isVisible().catch(() => false)) {
      return;
    }
    const close = dialog.getByRole('button', { name: /^ปิด$|^Close$/i });
    if (await close.isVisible().catch(() => false)) {
      await close.click();
      await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
  }
}

const pinResult = await resolveScreenshotPin();
if (!pinResult) {
  console.error('Set SCREENSHOT_PIN, APP_PIN, or APP_READ_ONLY_PIN (6 digits).');
  process.exit(1);
}
const PIN = pinResult.pin;
if (pinResult.readOnly) {
  console.warn(
    'Warning: using read-only PIN. UI may look faded (opacity-60). Prefer APP_PIN for screenshots.',
  );
} else {
  console.log(`Using ${pinResult.source} for full-fidelity UI.`);
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function dismissPostPinPrompts(page) {
  const skip = page.getByRole('button', { name: /Skip for now|ข้ามไปก่อน/i });
  for (let i = 0; i < 3; i++) {
    if (!(await skip.isVisible({ timeout: 4000 }).catch(() => false))) break;
    await skip.click();
    await page.waitForTimeout(400);
  }
}

async function ensurePinGateway(page) {
  if (await page.locator('#app-main').first().isVisible().catch(() => false)) {
    return;
  }

  await page
    .waitForFunction(
      () =>
        Boolean(document.querySelector('#bb-pin-gateway')) ||
        Boolean(document.querySelector('#app-main')),
      { timeout: 180000 },
    )
    .catch(() => {});

  if (await page.locator('#app-main').first().isVisible().catch(() => false)) {
    return;
  }

  const pinInput = page.locator('#bb-pin-gateway');
  await pinInput.waitFor({ state: 'attached', timeout: 60000 });

  await pinInput.click();
  await pinInput.fill(String(PIN));
  await page
    .getByText(/กำลังตรวจสอบ|Checking PIN/i)
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {});

  const skipEnrollment = page.getByRole('button', { name: /Skip for now|ข้ามไปก่อน/i });
  await Promise.race([
    page.locator('#app-main').waitFor({ state: 'visible', timeout: 180000 }),
    skipEnrollment.waitFor({ state: 'visible', timeout: 180000 }),
  ]).catch(() => {});

  await dismissPostPinPrompts(page);
  await page.locator('#app-main').waitFor({ state: 'visible', timeout: 180000 });
}

async function bodyHasShellContent(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText?.trim() ?? '';
    return Boolean(document.querySelector('#app-main')) && text.length > 12;
  });
}

async function ensureAppShellReady(page) {
  const appMain = page.locator('#app-main').first();
  if (await appMain.isVisible().catch(() => false)) return true;

  const pinInput = page.locator('#bb-pin-gateway');
  if (await pinInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ensurePinGateway(page);
    return await appMain.isVisible().catch(() => false);
  }

  await appMain.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  return await appMain.isVisible().catch(() => false);
}

async function settleAfterNavigation(page) {
  await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function waitForRouteContent(page, shot) {
  const errorPattern = /This page couldn't load|โหลดหน้านี้ไม่สำเร็จ/i;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const backoffMs = 2500 * attempt;
      console.warn(`Retrying ${shot.id} after empty chunk/shell (wait ${backoffMs}ms)`);
      await page.waitForTimeout(backoffMs);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
      await settleAfterNavigation(page);
    }

    await ensureAppShellReady(page).catch(() => false);

    const shellReady = await page
      .waitForFunction(
        () => {
          const text = document.body?.innerText?.trim() ?? '';
          return Boolean(document.querySelector('#app-main')) && text.length > 12;
        },
        { timeout: 120000 },
      )
      .then(() => true)
      .catch(() => false);

    if (!shellReady) continue;

    await page.locator(shot.waitSelector).first().waitFor({ state: 'visible', timeout: 120000 });
    await waitForStableFrame(page);

    const errorUi = await page.getByText(errorPattern).isVisible().catch(() => false);
    if (!errorUi) return;
  }

  throw new Error(`Route ${shot.id} did not reach ready state (shell, selector, or chunk error).`);
}

async function gotoRoute(page, url) {
  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await page.waitForTimeout(1500 * (i + 1));
    }
  }
}

async function waitForStableFrame(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function waitForLayoutShell(page, profile) {
  await page.locator('#app-main').first().waitFor({ state: 'visible', timeout: 60000 });
  if (profile === 'desktop') {
    await page
      .locator('aside')
      .filter({ has: page.locator('.bb-sidebar-logo') })
      .first()
      .waitFor({ state: 'visible', timeout: 90000 });
  } else {
    await page
      .waitForFunction(() => window.matchMedia('(max-width: 767px)').matches, { timeout: 15000 })
      .catch(() => {});
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function dismissOpenOverlays(page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    const close = dialog.getByRole('button', { name: /^ปิด$|^Close$/i });
    if (await close.isVisible().catch(() => false)) {
      await close.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }
}

async function captureShot(page, context, shot, outDir, viewport, profile, aliasConfig, session, manifest) {
  const outPath = path.join(outDir, shot.rawFile);
  if (process.env.SCREENSHOT_FORCE !== '1') {
    try {
      await fs.access(outPath);
      console.log('skip existing', outPath);
      return outPath;
    } catch {
      /* capture */
    }
  }

  await page.setViewportSize(viewport);
  await dismissOpenOverlays(page);

  const dashboardRange =
    shot.dashboardRange === true ? manifest.dashboardScreenshotRange : shot.dashboardRange;
  if (dashboardRange?.start && dashboardRange?.end) {
    await applyDashboardScreenshotRange(context, page, dashboardRange);
  }

  const pathPart =
    dashboardRange?.start && dashboardRange?.end
      ? routeWithDashboardQuery(shot.route, dashboardRange)
      : shot.route;
  await gotoRoute(page, `${BASE}${pathPart}`);
  await settleAfterNavigation(page);
  if (dashboardRange?.start && dashboardRange?.end) {
    await persistDashboardRangeInPage(page, dashboardRange).catch(() => {});
  }
  session.warmed = true;

  await page
    .waitForURL((url) => url.pathname.startsWith('/th/'), { timeout: 45000 })
    .catch(() => {
      throw new Error(`Expected /th/ route after navigation, got ${page.url()}`);
    });
  if (!session.authenticated) {
    await ensurePinGateway(page);
    await page.locator('#app-main').first().waitFor({ state: 'visible', timeout: 120000 });
    session.authenticated = true;
  } else {
    await dismissPostPinPrompts(page);
    await ensureAppShellReady(page);
  }

  await waitForRouteContent(page, shot);
  await waitForLayoutShell(page, profile);
  await waitForStableFrame(page);

  if (shot.scrollBranchWithdrawBody === 'bottom') {
    await page.evaluate(() => {
      const scrollers = [...document.querySelectorAll('.overflow-y-auto.bb-smooth-scroll')];
      const body =
        scrollers.find((el) => el.scrollHeight > el.clientHeight + 8) ?? scrollers.at(-1);
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    });
    await page.waitForTimeout(400);
    await waitForStableFrame(page);
  }

  if (shot.openNotificationPanel) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const hasHydratedList = async () =>
      page.evaluate(() => {
        try {
          const raw = localStorage.getItem('bb-inventory-notifications');
          if (!raw) return false;
          const list = JSON.parse(raw);
          return Array.isArray(list) && list.length > 0;
        } catch {
          return false;
        }
      });

    if (!(await hasHydratedList())) {
      await page.waitForTimeout(12000);
    }

    if (!(await hasHydratedList()) && session.notificationSeedJson) {
      await page.evaluate((json) => {
        localStorage.setItem('bb-inventory-notifications', json);
      }, session.notificationSeedJson);
      await gotoRoute(page, page.url());
      await page.locator(shot.waitSelector).first().waitFor({ state: 'visible', timeout: 60000 });
      await waitForLayoutShell(page, profile);
      await page.waitForTimeout(2000);
    }
    await openNotificationPanelWithRetry(page);
    await waitForNotificationPanelPopulated(page);
  }

  await hideDevOverlays(page);

  const redactMode = shot.redactMode ?? 'none';
  await runDomAnonymize(page, aliasConfig, redactMode);

  const fullPage = shot.captureFullPage === true;

  const errorUi = await page
    .getByText(/This page couldn't load|โหลดหน้านี้ไม่สำเร็จ/i)
    .isVisible()
    .catch(() => false);
  if (errorUi) {
    const snippet = await page.locator('body').innerText().catch(() => '');
    throw new Error(
      `Capture aborted for ${shot.id}: page error UI visible. Body: ${snippet.slice(0, 200)}`,
    );
  }

  await page.screenshot({ path: outPath, fullPage });
  console.log('saved', outPath, fullPage ? '(full page)' : '(viewport)');
  if (shot.openNotificationPanel) {
    await dismissOpenOverlays(page);
  }
  return outPath;
}

async function main() {
  const manifest = await loadJson(MANIFEST_PATH);
  const aliasConfig = await loadJson(STAFF_ALIAS_PATH);

  await fs.mkdir(RAW_MOBILE, { recursive: true });
  await fs.mkdir(RAW_DESKTOP, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    localStorage.setItem('bb-theme', 'light');
    try {
      localStorage.setItem(
        'sidebarOpen',
        JSON.stringify({ state: { isOpen: true }, version: 0 }),
      );
      localStorage.setItem(
        'bb-notification-prefs-v2',
        JSON.stringify({
          enabled: true,
          systemNotifications: true,
          dailyScheduleReports: true,
          proactiveInsights: true,
          securityAlerts: true,
          notifyOwnChanges: true,
        }),
      );
      localStorage.removeItem('bb-inventory-notifications-cleared-at');
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  const seed = await resolveNotificationSeedJson();
  if (seed) {
    console.log(`Notification seed: ${seed.source}`);
  } else {
    console.warn(
      'No notification seed (file or Supabase). Shot 11 may be empty. Add docs/marketing/screenshots/notification-list.seed.json or ensure data_change_logs has rows.',
    );
  }
  const session = {
    authenticated: false,
    warmed: false,
    notificationSeedJson: seed?.json ?? null,
  };

  const only = process.env.SCREENSHOT_ONLY?.trim();
  const mobileShots = only
    ? manifest.mobile.filter((s) => s.id === only)
    : manifest.mobile;
  const desktopShots = only
    ? manifest.desktop.filter((s) => s.id === only)
    : manifest.desktop;
  if (only && mobileShots.length === 0 && desktopShots.length === 0) {
    throw new Error(`SCREENSHOT_ONLY=${only} did not match any manifest id.`);
  }

  const profileVp =
    desktopShots.length > 0 && mobileShots.length === 0
      ? { width: 1440, height: 900 }
      : { width: 390, height: 844 };
  await page.setViewportSize(profileVp);
  console.log('Warming PIN session on /th/home …');
  await gotoRoute(page, `${BASE}/th/home`);
  await settleAfterNavigation(page);
  await ensurePinGateway(page);
  await page.locator('#app-main').first().waitFor({ state: 'visible', timeout: 180000 });
  session.authenticated = true;
  session.warmed = true;

  const mobileVp = { width: 390, height: 844 };
  for (const shot of mobileShots) {
    console.log('mobile', shot.id);
    await captureShot(page, context, shot, RAW_MOBILE, mobileVp, 'mobile', aliasConfig, session, manifest);
  }

  const desktopVp = { width: 1440, height: 900 };
  for (const shot of desktopShots) {
    console.log('desktop', shot.id);
    await captureShot(page, context, shot, RAW_DESKTOP, desktopVp, 'desktop', aliasConfig, session, manifest);
  }

  manifest.lastCapture = new Date().toISOString();
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  await browser.close();
  console.log('Capture complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
