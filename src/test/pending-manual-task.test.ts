import { describe, expect, test } from 'vitest';
import { buildPendingManualSecretaryTask } from '@/lib/secretary/pending-manual-task';

describe('buildPendingManualSecretaryTask', () => {
  test('builds a manual card that can show before the save returns', () => {
    const task = buildPendingManualSecretaryTask({
      id: 'pending-1',
      title: 'เช็ดเคาน์เตอร์',
      description: '  ก่อนเปิดร้าน  ',
      scheduledDate: '2026-10-02',
      nowIso: '2026-10-02T01:00:00.000Z',
    });

    expect(task).toMatchObject({
      id: 'pending-1',
      title: 'เช็ดเคาน์เตอร์',
      description: 'ก่อนเปิดร้าน',
      source_kind: 'manual',
      task_type: 'custom',
      module: 'custom',
      status: 'pending',
      scheduled_date: '2026-10-02',
    });
  });
});
