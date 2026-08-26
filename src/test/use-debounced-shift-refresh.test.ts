import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedShiftRefresh } from '@/hooks/useDebouncedShiftRefresh';

describe('useDebouncedShiftRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('skips debounced refresh while a shift mutation is in flight', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedShiftRefresh({
        debounceMs: 300,
        onRefresh,
      }),
    );

    act(() => {
      result.current.beginShiftMutation();
      result.current.scheduleRefresh();
      vi.advanceTimersByTime(300);
    });

    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      result.current.endShiftMutation();
      result.current.scheduleRefresh();
      vi.advanceTimersByTime(300);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('endShiftMutation schedules refresh only after the last in-flight mutation completes', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedShiftRefresh({
        debounceMs: 300,
        onRefresh,
      }),
    );

    act(() => {
      result.current.beginShiftMutation();
      result.current.beginShiftMutation();
      result.current.endShiftMutation({ scheduleRefresh: true });
      vi.advanceTimersByTime(300);
    });

    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      result.current.endShiftMutation({ scheduleRefresh: true });
      vi.advanceTimersByTime(300);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('force refresh runs even while a mutation is in flight', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedShiftRefresh({
        onRefresh,
      }),
    );

    act(() => {
      result.current.beginShiftMutation();
      result.current.runRefresh({ force: true });
    });

    expect(onRefresh).toHaveBeenCalledWith({ force: true });
  });
});
