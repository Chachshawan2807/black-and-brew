import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

describe('schedule clear-all removed', () => {
  const scheduleClientCode = fs.readFileSync(
    path.resolve(__dirname, '../app/[locale]/schedule/ScheduleClient.tsx'),
    'utf-8',
  );
  const toolbarCode = fs.readFileSync(
    path.resolve(__dirname, '../app/[locale]/schedule/_components/ScheduleToolbar.tsx'),
    'utf-8',
  );

  test('toolbar has no clear-all button or prop', () => {
    expect(toolbarCode).not.toContain('ล้างทั้งหมด');
    expect(toolbarCode).not.toContain('onShowClearConfirm');
  });

  test('ScheduleClient has no clear-all handler, confirm state, or modal', () => {
    expect(scheduleClientCode).not.toContain('handleClearAll');
    expect(scheduleClientCode).not.toContain('showClearConfirm');
    expect(scheduleClientCode).not.toContain('onShowClearConfirm');
    expect(scheduleClientCode).not.toContain('ยืนยันการลบข้อมูล');
  });
});
