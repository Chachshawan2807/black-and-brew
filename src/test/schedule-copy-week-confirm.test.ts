import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('schedule copy previous week confirmation', () => {
  const scheduleClientCode = fs.readFileSync(
    path.resolve(__dirname, '../app/[locale]/schedule/ScheduleClient.tsx'),
    'utf-8',
  );

  test('shows a centered confirm modal before copying the previous week', () => {
    expect(scheduleClientCode).toContain('showCopyPreviousWeekConfirm');
    expect(scheduleClientCode).toContain('setShowCopyPreviousWeekConfirm(true)');
    expect(scheduleClientCode).toContain('centerScrollable');
    expect(scheduleClientCode).toContain('keyboardAware');
    expect(scheduleClientCode).toContain('aria-label="ยืนยันคัดลอกสัปดาห์ก่อน"');
    expect(scheduleClientCode).toContain('showCopyPreviousWeekConfirm');
    expect(scheduleClientCode).not.toContain('onCopyPreviousWeek={handleCopyPreviousWeek}');
  });
});
