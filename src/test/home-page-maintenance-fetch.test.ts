import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE_PATH = path.resolve(__dirname, '../app/[locale]/page.tsx');

describe('home page shell', () => {
  test('locale index redirects to home board (sidebar home)', () => {
    const page = fs.readFileSync(PAGE_PATH, 'utf-8');

    expect(page).toContain('redirect(`/${locale}/home`)');
    expect(page).not.toContain('getSupabaseAdmin');
    expect(page).not.toContain('LiveStatusTracker');
    expect(page).not.toContain('HomeOpsPanels');
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
