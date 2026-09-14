import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE_PATH = path.resolve(__dirname, '../app/[locale]/page.tsx');

describe('home page shell', () => {
  test('RSC home page does not load dashboard data or home widgets', () => {
    const page = fs.readFileSync(PAGE_PATH, 'utf-8');

    expect(page).toContain('data-testid="home-page-shell"');
    expect(page).not.toContain('getSupabaseAdmin');
    expect(page).not.toContain('queryHomeMaintenanceTasks');
    expect(page).not.toContain('LiveStatusTracker');
    expect(page).not.toContain('HomeOpsPanels');
    expect(page).not.toContain('HomePageClient');
    expect(page).not.toContain('dynamic(');
    expect(page).not.toContain("from('profiles')");
    expect(page).not.toContain("from('shifts')");
    expect(page).not.toContain("from('inventory_items')");
  });

  test('locale loading copy is generic (not live status dashboard)', () => {
    const loading = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/loading.tsx'),
      'utf-8',
    );
    expect(loading).not.toContain('สถานะล่าสุด');
    expect(loading).toContain('กำลังโหลด...');
  });
});
