import { describe, expect, test } from 'vitest';
import {
  formatSecretaryWorkDateLabel,
  resolveSecretaryBoardCardClass,
  SECRETARY_MODULE_BOARD_TAGS,
} from '@/lib/secretary/board-card-surface';
import { SECRETARY_MODULE_CARD_COLORS } from '@/lib/shift-colors';

describe('resolveSecretaryBoardCardClass', () => {
  test('uses module pastel only (no status or priority styling)', () => {
    expect(resolveSecretaryBoardCardClass('inventory')).toContain(
      SECRETARY_MODULE_CARD_COLORS.inventory,
    );
    expect(resolveSecretaryBoardCardClass('schedule')).toContain(
      SECRETARY_MODULE_CARD_COLORS.schedule,
    );
  });

  test('module board tags cover every module key', () => {
    expect(Object.keys(SECRETARY_MODULE_BOARD_TAGS).sort()).toEqual(
      Object.keys(SECRETARY_MODULE_CARD_COLORS).sort(),
    );
  });
});

describe('formatSecretaryWorkDateLabel', () => {
  test('formats ISO dates for Bangkok locale', () => {
    const label = formatSecretaryWorkDateLabel('2026-09-15');
    expect(label).toContain('15');
    expect(label).toContain('กันยายน');
  });
});
