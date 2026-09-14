import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE_PATH = path.resolve(__dirname, '../app/[locale]/page.tsx');

describe('home page shell', () => {
  test('locale index does not use App Router redirect (hooks crash on /th → /home)', () => {
    const page = fs.readFileSync(PAGE_PATH, 'utf-8');

    expect(page).not.toMatch(/from 'next\/navigation'/);
    expect(page).not.toContain('redirect(');
    expect(page).toMatch(/from ['"]\.\/home\/page['"]/);
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
