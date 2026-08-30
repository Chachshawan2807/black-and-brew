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

  test('project dropdowns use RoundedSelect (dashboard employee picker pattern)', () => {
    const monthly = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(monthly).toContain('RoundedSelect');
    expect(monthly).toMatch(/RoundedSelect[\s\S]*?\bw-fit\b/);

    const beanList = readFile('app/[locale]/bean-orders/BeanOrdersClient.tsx');
    expect(beanList).toContain('RoundedSelect');

    const beanSelect = readFile('app/[locale]/bean-orders/_components/BeanOrderSelect.tsx');
    expect(beanSelect).toMatch(/BB_SELECT_TRIGGER_CLASS|RoundedSelect/);

    const scheduleClient = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(scheduleClient).toContain('RoundedSelect');
    expect(scheduleClient).not.toMatch(/<select[\s\S]*?เลือกพนักงาน/);

    const shiftSettings = readFile('app/[locale]/schedule/_components/ShiftSettingsModal.tsx');
    expect(shiftSettings).toContain('RoundedSelect');
    expect(shiftSettings).not.toMatch(/<select[\s\S]*?SELECT_NEW_CUSTOM/);

    const maintenance = readFile('app/[locale]/maintenance/_components/MaintenanceModals.tsx');
    expect(maintenance).toContain('RoundedSelect');
    expect(maintenance).not.toMatch(/<select[\s\S]*?TASK_TYPE_PRESETS/);
  });

  test('RoundedSelect portals listbox above overflow containers', () => {
    const roundedSelect = readFile('components/ui/rounded-select.tsx');
    expect(roundedSelect).toContain('createPortal');
    expect(roundedSelect).toContain('SELECT_LISTBOX_Z_CLASS');
    expect(roundedSelect).toContain('getAnchoredSuggestionsOverlayStyle');
    expect(roundedSelect).toContain('bindPointerSafeOptionSelect');
    expect(roundedSelect).not.toMatch(/role="listbox"[\s\S]*?BB_SELECT_LIST_CLASS/);
  });

  test('RoundedSelect listbox allows touch scrolling on mobile', () => {
    const roundedSelect = readFile('components/ui/rounded-select.tsx');
    expect(roundedSelect).toContain('bb-smooth-scroll');
    expect(roundedSelect).not.toMatch(
      /role="listbox"[\s\S]*?onPointerDown=\{\(e\) => e\.preventDefault\(\)\}/,
    );
  });
});
