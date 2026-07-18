import { describe, expect, test } from 'vitest';
import {
  SCHEDULE_EXPORT_DAY_COLUMN_WIDTH,
  SCHEDULE_EXPORT_GRID_TEMPLATE,
  SCHEDULE_EXPORT_NAME_COLUMN_WIDTH,
  SCHEDULE_EXPORT_TABLE_WIDTH,
  SCHEDULE_GRID_TEMPLATE,
  SCHEDULE_NAME_COLUMN_MIN,
  SCHEDULE_TABLE_MIN_WIDTH,
} from '@/lib/schedule/grid-layout';

describe('schedule grid layout', () => {
  test('uses a compact name column for short Thai names on screen', () => {
    expect(SCHEDULE_NAME_COLUMN_MIN).toBe('112px');
    expect(SCHEDULE_GRID_TEMPLATE).toContain(SCHEDULE_NAME_COLUMN_MIN);
  });

  test('uses fixed equal column widths for PNG export (no 1fr or per-row max-content)', () => {
    expect(SCHEDULE_EXPORT_GRID_TEMPLATE).toBe('88px repeat(7, 92px)');
    expect(SCHEDULE_EXPORT_GRID_TEMPLATE).not.toContain('1fr');
    expect(SCHEDULE_EXPORT_GRID_TEMPLATE).not.toContain('max-content');
    expect(SCHEDULE_EXPORT_NAME_COLUMN_WIDTH).toBe('88px');
    expect(SCHEDULE_EXPORT_DAY_COLUMN_WIDTH).toBe('92px');
    expect(SCHEDULE_EXPORT_TABLE_WIDTH).toBe('732px');
  });

  test('keeps table min width aligned with column mins', () => {
    expect(SCHEDULE_TABLE_MIN_WIDTH).toBe('880px');
  });
});
