import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('maintenance modals', () => {
  test('add/edit modal portals above FAB overlays with shared z-index', () => {
    const modalsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/maintenance/_components/MaintenanceModals.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(layoutCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(modalsCode).toContain('ModalPortal');
    expect(modalsCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(modalsCode).not.toContain('z-[100]');
  });

  test('date field uses operation wording and avoids square date-picker shell styles', () => {
    const modalsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/maintenance/_components/MaintenanceModals.tsx'),
      'utf-8',
    );

    expect(modalsCode).toContain('วันที่ดำเนินการ');
    expect(modalsCode).not.toContain('วันที่รับบริการ');
    expect(modalsCode).not.toContain(
      'containerClassName="bg-background border-border hover:border-foreground/20 hover:bg-muted/30 transition-all"',
    );
    expect(modalsCode).toContain('RoundedSelect');
    expect(modalsCode).not.toMatch(/<select[\s\S]*TASK_TYPE_PRESETS/);
  });

  test('service record form and table omit unused status, cost, assignee, and notes fields', () => {
    const modalsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/maintenance/_components/MaintenanceModals.tsx'),
      'utf-8',
    );
    const clientCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/maintenance/MaintenanceClient.tsx'),
      'utf-8',
    );

    expect(modalsCode).not.toContain('สถานะงาน');
    expect(modalsCode).not.toContain('ค่าใช้จ่าย (บาท)');
    expect(modalsCode).not.toContain('ผู้รับผิดชอบ');
    expect(modalsCode).not.toContain('หมายเหตุ');

    expect(clientCode).not.toContain('ผู้รับผิดชอบ');
    expect(clientCode).not.toContain('ค่าใช้จ่าย');
    expect(clientCode).not.toContain('>สถานะ<');
    expect(clientCode).not.toContain('person_in_charge');
    expect(clientCode).not.toContain('record.cost');
    expect(clientCode).not.toContain('record.status');
  });
});
