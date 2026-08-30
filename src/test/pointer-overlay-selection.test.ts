import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  activatePointerClickThroughGuard,
  bindPointerSafeOptionSelect,
  guardPointerClickThrough,
  installPointerClickThroughGuardCapture,
  isPointerClickThroughGuardActive,
  shouldIgnorePointerClickThrough,
} from '@/lib/pointer-overlay-selection';

function createPointerEvent(
  type: 'pointerdown' | 'pointerup',
  overrides: Partial<PointerEvent> = {},
): PointerEvent {
  const element = overrides.currentTarget as HTMLElement | undefined;
  return {
    pointerType: 'touch',
    pointerId: 1,
    button: 0,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: {
      setPointerCapture: vi.fn(),
      contains: vi.fn(() => true),
    },
    target: element ?? null,
    ...overrides,
  } as unknown as PointerEvent;
}

describe('pointer-overlay-selection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('activatePointerClickThroughGuard blocks clicks for a short window', () => {
    expect(isPointerClickThroughGuardActive()).toBe(false);
    activatePointerClickThroughGuard(400);
    expect(isPointerClickThroughGuardActive()).toBe(true);
    vi.advanceTimersByTime(399);
    expect(isPointerClickThroughGuardActive()).toBe(true);
    vi.advanceTimersByTime(2);
    expect(isPointerClickThroughGuardActive()).toBe(false);
  });

  test('guardPointerClickThrough skips handler while guard is active', () => {
    vi.setSystemTime(20_000);
    const handler = vi.fn();
    const guarded = guardPointerClickThrough(handler);

    guarded();
    expect(handler).toHaveBeenCalledTimes(1);

    activatePointerClickThroughGuard();
    guarded();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('document capture prevents ghost click propagation while guard is active', () => {
    const cleanup = installPointerClickThroughGuardCapture();
    activatePointerClickThroughGuard();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const stopPropagation = vi.spyOn(event, 'stopPropagation');

    document.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(shouldIgnorePointerClickThrough()).toBe(true);

    cleanup();
  });

  test('bindPointerSafeOptionSelect selects immediately on mouse pointerdown', () => {
    const onSelect = vi.fn();
    const handlers = bindPointerSafeOptionSelect(onSelect);

    handlers.onPointerDown(
      createPointerEvent('pointerdown', { pointerType: 'mouse' }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(isPointerClickThroughGuardActive()).toBe(true);
  });

  test('bindPointerSafeOptionSelect selects immediately on pen pointerdown', () => {
    const onSelect = vi.fn();
    const handlers = bindPointerSafeOptionSelect(onSelect);

    handlers.onPointerDown(
      createPointerEvent('pointerdown', { pointerType: 'pen' }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(isPointerClickThroughGuardActive()).toBe(true);
  });

  test('bindPointerSafeOptionSelect selects touch taps on pointerup', () => {
    const onSelect = vi.fn();
    const element = document.createElement('button');
    const handlers = bindPointerSafeOptionSelect(onSelect);

    handlers.onPointerDown(
      createPointerEvent('pointerdown', {
        clientX: 40,
        clientY: 40,
        currentTarget: element,
        target: element,
      }),
    );
    expect(onSelect).not.toHaveBeenCalled();

    handlers.onPointerUp(
      createPointerEvent('pointerup', {
        clientX: 40,
        clientY: 40,
        currentTarget: element,
        target: element,
      }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(isPointerClickThroughGuardActive()).toBe(true);
  });

  test('bindPointerSafeOptionSelect ignores scroll-like touch movement', () => {
    const onSelect = vi.fn();
    const element = document.createElement('button');
    const handlers = bindPointerSafeOptionSelect(onSelect);

    handlers.onPointerDown(
      createPointerEvent('pointerdown', {
        clientX: 40,
        clientY: 40,
        currentTarget: element,
        target: element,
      }),
    );
    handlers.onPointerUp(
      createPointerEvent('pointerup', {
        clientX: 40,
        clientY: 72,
        currentTarget: element,
        target: element,
      }),
    );

    expect(onSelect).not.toHaveBeenCalled();
  });

  test('bindPointerSafeOptionSelect ignores non-primary mouse buttons', () => {
    const onSelect = vi.fn();
    const handlers = bindPointerSafeOptionSelect(onSelect);

    handlers.onPointerDown(createPointerEvent('pointerdown', { pointerType: 'mouse', button: 2 }));
    handlers.onPointerUp(createPointerEvent('pointerup', { pointerType: 'mouse', button: 2 }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  test('bindPointerSafeOptionSelect suppresses duplicate click while guard is active', () => {
    const handlers = bindPointerSafeOptionSelect(vi.fn());
    activatePointerClickThroughGuard();

    const click = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as ReactMouseEvent<HTMLElement>;

    handlers.onClick(click);
    expect(click.preventDefault).toHaveBeenCalled();
    expect(click.stopPropagation).toHaveBeenCalled();
  });
});
