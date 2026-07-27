import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('rounded select — shared date-picker-like trigger', () => {
  test('BB_SELECT_TRIGGER_CLASS matches ClickableDatePicker pill surface', async () => {
    const { BB_SELECT_TRIGGER_CLASS } = await import('@/components/ui/rounded-select');

    expect(BB_SELECT_TRIGGER_CLASS).toMatch(/\bh-11\b/);
    expect(BB_SELECT_TRIGGER_CLASS).toMatch(/\brounded-3xl\b/);
    expect(BB_SELECT_TRIGGER_CLASS).toMatch(/\bbg-card\b/);
    expect(BB_SELECT_TRIGGER_CLASS).toMatch(/\bbb-shadow-sm\b/);
    expect(BB_SELECT_TRIGGER_CLASS).toMatch(/\bappearance-none\b/);
    expect(BB_SELECT_TRIGGER_CLASS).toMatch(/\bborder-border\b/);
  });

  test('in-scope surfaces use RoundedSelect; schedule stays untouched', () => {
    const monthly = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(monthly).toContain('RoundedSelect');
    expect(monthly).toMatch(/RoundedSelect[\s\S]*?\bw-fit\b/);

    const sales = readFile('app/[locale]/sales/SalesClient.tsx');
    expect(sales).toContain('RoundedSelect');

    const beanList = readFile('app/[locale]/bean-orders/BeanOrdersClient.tsx');
    expect(beanList).toContain('RoundedSelect');

    const beanSelect = readFile('app/[locale]/bean-orders/_components/BeanOrderSelect.tsx');
    expect(beanSelect).toMatch(/BB_SELECT_TRIGGER_CLASS|RoundedSelect/);

    const scheduleClient = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(scheduleClient).not.toContain('RoundedSelect');
    expect(scheduleClient).not.toContain('BB_SELECT_TRIGGER_CLASS');

    const shiftSettings = readFile('app/[locale]/schedule/_components/ShiftSettingsModal.tsx');
    expect(shiftSettings).not.toContain('RoundedSelect');
    expect(shiftSettings).not.toContain('BB_SELECT_TRIGGER_CLASS');
  });
});
