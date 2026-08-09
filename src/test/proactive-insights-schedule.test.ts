import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
  scheduleProactiveInsightEvaluation,
  __resetInsightScheduleForTests,
} from '@/lib/proactive-insights/schedule-evaluation';

const evaluateMock = vi.fn();

vi.mock('@/lib/proactive-insights/evaluate-and-dispatch', () => ({
  evaluateAndDispatchInsights: (...args: unknown[]) => evaluateMock(...args),
}));

describe('scheduleProactiveInsightEvaluation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    evaluateMock.mockReset();
    evaluateMock.mockResolvedValue({ matchedRules: [] });
    __resetInsightScheduleForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetInsightScheduleForTests();
  });

  test('debounces multiple triggers into one evaluation', async () => {
    scheduleProactiveInsightEvaluation('shift_update');
    scheduleProactiveInsightEvaluation('inventory_update');
    scheduleProactiveInsightEvaluation('shift_update');

    expect(evaluateMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(evaluateMock).toHaveBeenCalledTimes(1);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'shift_update' }),
    );
  });

  test('uses last trigger after debounce window', async () => {
    scheduleProactiveInsightEvaluation('shift_update');
    await vi.advanceTimersByTimeAsync(60_000);
    scheduleProactiveInsightEvaluation('inventory_update');
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(evaluateMock).toHaveBeenCalledTimes(1);
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'inventory_update' }),
    );
  });
});
