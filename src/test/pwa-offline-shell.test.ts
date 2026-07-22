import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import manifest from '@/app/manifest';
import {
  PWA_OFFLINE_PAGE,
  PWA_PRECACHE_URLS,
  PWA_SERVICE_WORKER_PATH,
  PWA_SHORTCUTS,
  PWA_START_URL,
  buildManifestShortcuts,
} from '@/lib/pwa-config';
import {
  checkForServiceWorkerUpdate,
  installServiceWorkerUpdateListener,
} from '@/lib/pwa-update';

const ROOT = resolve(__dirname, '../..');

describe('PWA offline shell + install config', () => {
  test('manifest uses locale start_url and ERP shortcuts', () => {
    const m = manifest();
    expect(m.start_url).toBe(PWA_START_URL);
    expect(m.lang).toBe('th');
    expect(m.dir).toBe('ltr');
    expect(m.shortcuts?.length).toBe(PWA_SHORTCUTS.length);
    expect(m.shortcuts?.[0]?.url).toBe('/th/inventory');
  });

  test('buildManifestShortcuts includes brand icon for each shortcut', () => {
    const shortcuts = buildManifestShortcuts();
    expect(shortcuts.every((s) => s.icons[0]?.src === '/images/notification-icon.png')).toBe(
      true,
    );
  });

  test('offline.html exists with bilingual copy and retry affordance', () => {
    const html = readFileSync(resolve(ROOT, 'public/offline.html'), 'utf-8');
    expect(html).toContain('No internet connection');
    expect(html).toContain('ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
    expect(html).toContain('id="retry"');
    expect(html).toContain("addEventListener('online'");
  });

  test('service worker precaches offline shell and uses navigation fallback', () => {
    const sw = readFileSync(resolve(ROOT, 'public/sw.js'), 'utf-8');
    expect(sw).toContain(PWA_OFFLINE_PAGE);
    expect(sw).toContain('resolveOfflineNavigationFallback');
    for (const url of PWA_PRECACHE_URLS) {
      if (url === PWA_SERVICE_WORKER_PATH) continue;
      expect(sw).toContain(url);
    }
  });

  test('PwaRegister registers SW with updateViaCache none and update listener', () => {
    const source = readFileSync(resolve(ROOT, 'src/components/PwaRegister.tsx'), 'utf-8');
    expect(source).toContain('updateViaCache:');
    expect(source).toContain('installServiceWorkerUpdateListener');
    expect(source).toContain('checkForServiceWorkerUpdate');
  });

  test('next.config sets no-cache headers for service worker assets', () => {
    const config = readFileSync(resolve(ROOT, 'next.config.ts'), 'utf-8');
    expect(config).toContain("source: '/sw.js'");
    expect(config).toContain('Service-Worker-Allowed');
    expect(config).toContain('no-cache');
  });

  test('pwa-update exports lifecycle helpers', () => {
    expect(typeof installServiceWorkerUpdateListener).toBe('function');
    expect(typeof checkForServiceWorkerUpdate).toBe('function');
  });
});
