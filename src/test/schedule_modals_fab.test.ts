import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('schedule modals above FAB stack', () => {
  const scheduleClientCode = fs.readFileSync(
    path.resolve(__dirname, '../app/[locale]/schedule/ScheduleClient.tsx'),
    'utf-8',
  );
  const shiftSettingsCode = fs.readFileSync(
    path.resolve(__dirname, '../app/[locale]/schedule/_components/ShiftSettingsModal.tsx'),
    'utf-8',
  );
  const layoutCode = fs.readFileSync(
    path.resolve(__dirname, '../lib/floating-action-layout.ts'),
    'utf-8',
  );

  test('shared z-index constant sits above FAB buttons (z-201)', () => {
    expect(layoutCode).toContain('APP_MODAL_ABOVE_FAB_Z_INDEX');
    expect(layoutCode).toMatch(/APP_MODAL_ABOVE_FAB_Z_INDEX\s*=\s*220/);
  });

  test('schedule modals portal to document.body and use shared above-FAB z-index', () => {
    expect(scheduleClientCode).toContain('ModalPortal');
    expect(scheduleClientCode).toContain('APP_MODAL_ABOVE_FAB_Z_INDEX');
    expect(scheduleClientCode).not.toMatch(/zIndex=\{70\}/);
    expect(scheduleClientCode).not.toMatch(/zIndex=\{75\}/);
    expect(scheduleClientCode).not.toMatch(/zIndex=\{110\}/);

    expect(shiftSettingsCode).toContain('ModalPortal');
    expect(shiftSettingsCode).toContain('APP_MODAL_ABOVE_FAB_Z_INDEX');
    expect(shiftSettingsCode).not.toMatch(/zIndex=\{75\}/);
  });
});
