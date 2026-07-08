import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const dashboardPagePath = resolve(__dirname, '../app/[locale]/dashboard/page.tsx');
const dashboardStreamsPath = resolve(
  __dirname,
  '../app/[locale]/dashboard/_components/DashboardStreams.tsx',
);

describe('dashboard server-side auth hardening', () => {
  test('dashboard page gates with checkAuth and redirects unauthenticated users', () => {
    const source = readFileSync(dashboardPagePath, 'utf-8');
    expect(source).toContain("import { checkAuth } from '@/app/actions/auth'");
    expect(source).toContain("import { redirect } from 'next/navigation'");
    expect(source).toMatch(/checkAuth\(\)/);
    expect(source).toMatch(/if\s*\(\s*!authed\s*\)/);
    expect(source).toMatch(/redirect\(`\/\$\{locale\}`\)/);
  });

  test('dashboard streams fetch with admin client after page auth gate', () => {
    const source = readFileSync(dashboardStreamsPath, 'utf-8');
    expect(source).toContain("import { getSupabaseAdmin } from '@/lib/supabase-server'");
    expect(source).not.toContain("from '@/lib/supabase'");
  });
});
