import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('dropdown placement standard (below anchor, scroll, no flip)', () => {
  test('anchored overlay layout never places above the trigger', () => {
    const layout = read('lib/quick-search-suggestions-layout.ts');
    expect(layout).toContain("export type QuickSearchSuggestionsPlacement = 'below'");
    expect(layout).toContain('ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX');
    expect(layout).not.toMatch(/placement:\s*'above'/);
    expect(layout).not.toMatch(/\bbottom:\s*viewportBottom/);
  });

  test('RoundedSelect uses shared max height without viewport clamp', () => {
    const roundedSelect = read('components/ui/rounded-select.tsx');
    expect(roundedSelect).toContain('ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX');
    expect(roundedSelect).toContain('maxHeight: LISTBOX_MAX_HEIGHT_PX');
    expect(roundedSelect).not.toMatch(/Math\.min\(anchored\.maxHeight/);
  });

  test('in-flow autocomplete lists anchor below with scroll cap', () => {
    for (const file of [
      'app/[locale]/bean-orders/_components/AutocompleteTextField.tsx',
      'app/[locale]/maintenance/_components/MaintenanceModals.tsx',
      'app/[locale]/bean-orders/_components/ThaiPostalAddressSection.tsx',
    ]) {
      const source = read(file);
      expect(source, file).toContain('BB_DROPDOWN_BELOW_ANCHOR_CLASS');
      expect(source, file).toContain('BB_DROPDOWN_LIST_MAX_HEIGHT_CLASS');
    }

    const autocomplete = read('app/[locale]/bean-orders/_components/AutocompleteTextField.tsx');
    expect(autocomplete).not.toMatch(/suggestions\.slice\(0,\s*\d+\)/);
  });

  test('inventory quick search uses shared list height', () => {
    const bar = read('app/[locale]/inventory/_components/InventoryQuickActionBar.tsx');
    expect(bar).toContain('getAnchoredSuggestionsOverlayStyle');
    expect(bar).toContain('BB_DROPDOWN_LIST_MAX_HEIGHT_CLASS');
    expect(bar).toContain('top-full');
    expect(bar).not.toMatch(/max-h-\[min\(50dvh,16rem\)\]/);
  });

  test('schedule shift picker opens below anchor without vertical flip', () => {
    const schedule = read('app/[locale]/schedule/ScheduleClient.tsx');
    expect(schedule).toMatch(/anchorY \+ GAP/);
    expect(schedule).not.toMatch(/anchorY - menuHeight/);
    expect(schedule).toMatch(/max-h-60[\s\S]*shiftTypes\.map/);
  });

  test('date pickers open below trigger on desktop', () => {
    for (const file of ['components/ui/ClickableDatePicker.tsx', 'components/ui/ClickableDateRangePicker.tsx']) {
      const source = read(file);
      expect(source, file).toMatch(/rect\.bottom \+ 8/);
      expect(source, file).not.toMatch(/rect\.top - POPOVER_HEIGHT/);
    }
  });
});
