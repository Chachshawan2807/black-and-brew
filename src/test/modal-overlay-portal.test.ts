import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('modal overlay portal (native dialog top layer)', () => {
  test('FadeModalScaffold exposes dialog node for nested overlay portals', () => {
    const scaffold = readFile('components/ui/fade-modal-scaffold.tsx');
    expect(scaffold).toContain('ModalOverlayPortalProvider');
    expect(scaffold).toContain('setOverlayPortalContainer');
  });

  test('RoundedSelect and date pickers portal into overlay container hook', () => {
    const roundedSelect = readFile('components/ui/rounded-select.tsx');
    expect(roundedSelect).toContain('useOverlayPortalContainer');
    expect(roundedSelect).not.toMatch(/createPortal\(listbox,\s*document\.body\)/);

    const rangePicker = readFile('components/ui/ClickableDateRangePicker.tsx');
    expect(rangePicker).toContain('useOverlayPortalContainer');

    const datePicker = readFile('components/ui/ClickableDatePicker.tsx');
    expect(datePicker).toContain('useOverlayPortalContainer');
  });

  test('schedule management modal uses affected controls', () => {
    const scheduleClient = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(scheduleClient).toMatch(/showManagementModal[\s\S]*RoundedSelect/);
    expect(scheduleClient).toMatch(/showManagementModal[\s\S]*ClickableDateRangePicker/);
  });
});
