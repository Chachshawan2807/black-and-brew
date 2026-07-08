import React, { useState } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

let shiftChangeHandler: (() => void) | null = null;
let profileChangeHandler: (() => void) | null = null;

vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(function on(this: { on: ReturnType<typeof vi.fn> }, event, filter, handler) {
        if (filter?.table === 'shifts') shiftChangeHandler = handler;
        if (filter?.table === 'profiles') profileChangeHandler = handler;
        return this;
      }),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('useShiftRealtime listener lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    shiftChangeHandler = null;
    profileChangeHandler = null;
  });

  afterEach(() => {
    cleanup();
  });

  test('re-renders do not accumulate shift listeners', async () => {
    const { useShiftRealtime, __getShiftRealtimeStateForTests } = await import(
      '@/hooks/use-shift-realtime'
    );
    let shiftCallCount = 0;

    function TestComponent() {
      const [, setTick] = useState(0);
      useShiftRealtime({
        onShiftsChange: () => {
          shiftCallCount += 1;
        },
      });

      return (
        <button type="button" onClick={() => setTick((value) => value + 1)}>
          rerender
        </button>
      );
    }

    const view = render(<TestComponent />);

    await waitFor(() => expect(shiftChangeHandler).not.toBeNull());
    expect(__getShiftRealtimeStateForTests().shiftListenerCount).toBe(1);

    fireEvent.click(view.getByRole('button'));
    fireEvent.click(view.getByRole('button'));
    fireEvent.click(view.getByRole('button'));

    expect(__getShiftRealtimeStateForTests().shiftListenerCount).toBe(1);

    shiftCallCount = 0;
    shiftChangeHandler!();
    expect(shiftCallCount).toBe(1);

    view.unmount();
    expect(__getShiftRealtimeStateForTests().shiftListenerCount).toBe(0);
  });

  test('remount after unmount keeps a single active listener', async () => {
    const { useShiftRealtime, __getShiftRealtimeStateForTests } = await import(
      '@/hooks/use-shift-realtime'
    );
    let shiftCallCount = 0;

    function TestComponent() {
      useShiftRealtime({
        onShiftsChange: () => {
          shiftCallCount += 1;
        },
      });
      return null;
    }

    const first = render(<TestComponent />);
    await waitFor(() => expect(shiftChangeHandler).not.toBeNull());
    expect(__getShiftRealtimeStateForTests().shiftListenerCount).toBe(1);

    first.unmount();
    expect(__getShiftRealtimeStateForTests().shiftListenerCount).toBe(0);

    render(<TestComponent />);
    expect(__getShiftRealtimeStateForTests().shiftListenerCount).toBe(1);

    shiftCallCount = 0;
    shiftChangeHandler!();
    expect(shiftCallCount).toBe(1);
  });

  test('unmount removes listeners so events stop firing', async () => {
    const { useShiftRealtime } = await import('@/hooks/use-shift-realtime');
    let shiftCallCount = 0;

    function TestComponent() {
      useShiftRealtime({
        onShiftsChange: () => {
          shiftCallCount += 1;
        },
      });
      return null;
    }

    const view = render(<TestComponent />);
    await waitFor(() => expect(shiftChangeHandler).not.toBeNull());

    shiftChangeHandler!();
    expect(shiftCallCount).toBe(1);

    view.unmount();

    shiftCallCount = 0;
    shiftChangeHandler!();
    expect(shiftCallCount).toBe(0);
  });
});
