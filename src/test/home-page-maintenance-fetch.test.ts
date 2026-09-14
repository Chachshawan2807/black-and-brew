import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('home page shell', () => {
  test('RSC home page does not load dashboard data (empty shell)', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/page.tsx'),
      'utf-8',
    );

    expect(page).not.toContain('queryHomeMaintenanceTasks');
    expect(page).not.toContain("from('profiles')");
    expect(page).not.toContain('getSupabaseAdmin');
    expect(page).toMatch(/import\('\.\/_components\/HomePageClient'\)/);
  });
});
