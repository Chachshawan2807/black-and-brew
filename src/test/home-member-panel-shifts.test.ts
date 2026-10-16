import { describe, expect, test } from 'vitest';
import { splitHomeMemberPanelShifts } from '@/lib/schedule/home-member-panel';

describe('home member panel shift ranges', () => {
  test('splits one continuous result by Bangkok calendar day boundaries', () => {
    const rows = [
      { id: 'today-start', start_time: '2026-10-16T17:00:00.000Z' },
      { id: 'today-end', start_time: '2026-10-17T16:59:59.999Z' },
      { id: 'tomorrow-start', start_time: '2026-10-17T17:00:00.000Z' },
      { id: 'tomorrow-offset', start_time: '2026-10-18T02:30:00+07:00' },
      { id: 'outside-range', start_time: '2026-10-18T17:00:00.000Z' },
    ];

    expect(
      splitHomeMemberPanelShifts(rows, '2026-10-17', '2026-10-18'),
    ).toEqual({
      shifts: rows.slice(0, 2),
      tomorrowShifts: rows.slice(2, 4),
    });
  });
});
