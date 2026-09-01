import { describe, expect, test } from 'vitest';
import {
  buildAutoSkippedMetadata,
  isRowEligibleForStaleSkip,
  isSystemRetiredMetadata,
} from '@/lib/secretary/retire-stale-tasks';

describe('retire stale secretary tasks', () => {
  test('buildAutoSkippedMetadata clears legacy autoCompleted flag', () => {
    const metadata = buildAutoSkippedMetadata(
      { autoCompleted: true, aiSuggested: true, rationale: 'ทดสอบ' },
      'stale_ai',
    );
    expect(metadata.autoSkipped).toBe(true);
    expect(metadata.autoSkippedReason).toBe('stale_ai');
    expect(metadata.autoCompleted).toBeUndefined();
    expect(metadata.aiSuggested).toBe(true);
  });

  test('isSystemRetiredMetadata covers autoSkipped and legacy autoCompleted', () => {
    expect(isSystemRetiredMetadata({ autoSkipped: true })).toBe(true);
    expect(isSystemRetiredMetadata({ autoCompleted: true })).toBe(true);
    expect(isSystemRetiredMetadata({})).toBe(false);
  });

  test('isRowEligibleForStaleSkip keeps pending tasks and legacy autoCompleted done rows', () => {
    expect(isRowEligibleForStaleSkip({ status: 'pending' })).toBe(true);
    expect(isRowEligibleForStaleSkip({ status: 'in_progress' })).toBe(true);
    expect(
      isRowEligibleForStaleSkip({
        status: 'done',
        metadata: { autoCompleted: true },
      }),
    ).toBe(true);
    expect(isRowEligibleForStaleSkip({ status: 'done', metadata: {} })).toBe(false);
    expect(isRowEligibleForStaleSkip({ status: 'skipped' })).toBe(false);
  });
});
