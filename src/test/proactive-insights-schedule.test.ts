import { describe, expect, test, vi, beforeEach } from 'vitest';
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
    evaluateMock.mockReset();
    evaluateMock.mockResolvedValue({ matchedRules: [] });
    __resetInsightScheduleForTests();
  });

  test('evaluates shift updates immediately', async () => {
    scheduleProactiveInsightEvaluation('shift_update');
    await vi.waitFor(() => {
      expect(evaluateMock).toHaveBeenCalledTimes(1);
    });
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'shift_update' }),
    );
  });

  test('evaluates inventory updates immediately', async () => {
    scheduleProactiveInsightEvaluation('inventory_update');
    await vi.waitFor(() => {
      expect(evaluateMock).toHaveBeenCalledTimes(1);
    });
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'inventory_update' }),
    );
  });

  test('bean_order_update evaluates immediately', async () => {
    scheduleProactiveInsightEvaluation('bean_order_update');
    await vi.waitFor(() => {
      expect(evaluateMock).toHaveBeenCalledTimes(1);
    });
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'bean_order_update' }),
    );
  });

  test('uses the latest trigger when multiple mutations happen back-to-back', async () => {
    scheduleProactiveInsightEvaluation('shift_update');
    scheduleProactiveInsightEvaluation('inventory_update');
    await vi.waitFor(() => {
      expect(evaluateMock).toHaveBeenCalledTimes(1);
    });
    expect(evaluateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ trigger: 'inventory_update' }),
    );
  });
});
