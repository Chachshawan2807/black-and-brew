import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('useHomeMaintenanceTasks realtime strategy', () => {
  const hookPath = path.join(process.cwd(), 'src/hooks/use-home-maintenance-tasks.ts');
  const source = fs.readFileSync(hookPath, 'utf8');

  test('subscribes to service_records postgres_changes and refreshes due tasks', () => {
    expect(source).toContain("table: 'service_records'");
    expect(source).toContain('postgres_changes');
    expect(source).toContain('fetchHomeMaintenanceTasks');
  });

  test('refreshes again when the tab becomes visible', () => {
    expect(source).toContain('visibilitychange');
    expect(source).toContain("document.visibilityState === 'visible'");
  });
});
