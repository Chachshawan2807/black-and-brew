import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('bean order form dialog preload', () => {
  test('shared preload helpers dedupe dynamic imports', () => {
    const helper = fs.readFileSync(
      path.resolve(ROOT, 'lib/preload-bean-order-form-dialogs.ts'),
      'utf-8',
    );

    expect(helper).toContain("import('@/app/[locale]/bean-orders/_components/PasteCustomerDialog')");
    expect(helper).toContain("import('@/app/[locale]/bean-orders/_components/ClearCustomerConfirmDialog')");
    expect(helper).toContain("import('@/app/[locale]/bean-orders/_components/AddressProfilePickerDialog')");
    expect(helper).toContain('createPreloadOnce');
  });

  test('BeanOrderFormClient defers dialogs behind dynamic imports and intent preload', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/bean-orders/BeanOrderFormClient.tsx'),
      'utf-8',
    );

    expect(client).not.toContain("import { PasteCustomerDialog }");
    expect(client).not.toContain("import { ClearCustomerConfirmDialog }");
    expect(client).not.toContain("import { AddressProfilePickerDialog }");
    expect(client).toMatch(/dynamic\([\s\S]*PasteCustomerDialog/);
    expect(client).toMatch(/dynamic\([\s\S]*ClearCustomerConfirmDialog/);
    expect(client).toMatch(/dynamic\([\s\S]*AddressProfilePickerDialog/);
    expect(client).toContain('preloadPasteCustomerDialog');
    expect(client).toContain('preloadClearCustomerConfirmDialog');
    expect(client).toContain('preloadAddressProfilePickerDialog');
    expect(client).toContain('scheduleIdleWork');
    expect(client).toMatch(/\{pasteOpen \? \([\s\S]*<PasteCustomerDialog/);
    expect(client).toMatch(/\{clearConfirmOpen \? \([\s\S]*<ClearCustomerConfirmDialog/);
  });
});

describe('dashboard leave detail dialog preload', () => {
  test('shared preload helper dedupes dynamic import', () => {
    const helper = fs.readFileSync(
      path.resolve(ROOT, 'lib/preload-leave-detail-dialog.ts'),
      'utf-8',
    );

    expect(helper).toContain("import('@/app/[locale]/dashboard/_components/LeaveDetailDialog')");
    expect(helper).toContain('createPreloadOnce');
  });

  test('LiveShiftList defers leave detail dialog and preloads on idle and stat intent', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/dashboard/_components/LiveShiftList.tsx'),
      'utf-8',
    );

    expect(client).not.toContain("import { LeaveDetailDialog } from './LeaveDetailDialog'");
    expect(client).toMatch(/dynamic\([\s\S]*LeaveDetailDialog/);
    expect(client).toContain('preloadLeaveDetailDialog');
    expect(client).toContain('onPreloadStatDialog={preloadLeaveDetailDialog}');
    expect(client).toMatch(/\{statDialog \? \([\s\S]*<LeaveDetailDialog/);
  });

  test('MonthlyRoster defers leave detail dialog and preloads before open', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/dashboard/_components/MonthlyRoster.tsx'),
      'utf-8',
    );

    expect(client).not.toContain("import { LeaveDetailDialog } from './LeaveDetailDialog'");
    expect(client).toMatch(/dynamic\([\s\S]*LeaveDetailDialog/);
    expect(client).toContain('preloadLeaveDetailDialog');
    expect(client).toMatch(/openLeaveDialog[\s\S]*preloadLeaveDetailDialog/);
    expect(client).toMatch(/\{statDialog \? \([\s\S]*<LeaveDetailDialog/);
  });
});
