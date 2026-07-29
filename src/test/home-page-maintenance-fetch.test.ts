import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('home page maintenance data loading', () => {
  test('RSC home page loads maintenance via admin client, not browser JWT session', () => {
    // Regression: fetchHomeMaintenanceTasks used a cached anon JWT on the server;
    // after expiry IndexPage logged "JWT expired" while sibling queries used admin.
    const page = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/page.tsx'),
      'utf-8',
    );

    expect(page).toContain('queryHomeMaintenanceTasks');
    expect(page).toContain('getSupabaseAdmin()');
    expect(page).not.toContain('fetchHomeMaintenanceTasks');
  });

  test('maintenance error logging extracts message from Postgrest-like objects', () => {
    const page = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/page.tsx'),
      'utf-8',
    );

    expect(page).toMatch(/getErrorMessage|formatUnknownError|toErrorMessage/);
    expect(page).not.toMatch(
      /maintenanceError instanceof Error \? maintenanceError\.message : String\(maintenanceError\)/,
    );
  });
});
