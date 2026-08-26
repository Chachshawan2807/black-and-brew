import type { MouseEvent, PointerEvent } from 'react';

const DEFAULT_GUARD_MS = 450;

/** Apply to decorative children inside pointer-safe option buttons (iOS text hitbox). */
export const POINTER_SAFE_OPTION_INNER_CLASS = 'pointer-events-none select-none';

let guardUntil = 0;

/** Block synthesized ghost clicks after overlay option selection (touch / pen). */
export function activatePointerClickThroughGuard(durationMs = DEFAULT_GUARD_MS): void {
  guardUntil = Math.max(guardUntil, Date.now() + durationMs);
}

export function isPointerClickThroughGuardActive(): boolean {
  return Date.now() < guardUntil;
}

export function shouldIgnorePointerClickThrough(): boolean {
  return isPointerClickThroughGuardActive();
}

export function guardPointerClickThrough<T extends (...args: never[]) => void>(
  handler: T,
): T {
  return ((...args: never[]) => {
    if (shouldIgnorePointerClickThrough()) return;
    return handler(...args);
  }) as T;
}

export type PointerSafeOptionHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
};

/**
 * Select on pointerdown for instant single-tap UX.
 * Activates click-through guard before onSelect so ghost clicks cannot reach controls below.
 */
export function bindPointerSafeOptionSelect(
  onSelect: () => void,
  options?: { onPointerDown?: () => void },
): PointerSafeOptionHandlers {
  let consumedPointerId: number | null = null;

  const runSelect = (pointerId: number) => {
    if (consumedPointerId === pointerId) return;
    consumedPointerId = pointerId;
    activatePointerClickThroughGuard();
    options?.onPointerDown?.();
    onSelect();
  };

  return {
    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      runSelect(event.pointerId);
    },
    onPointerUp(event) {
      if (event.pointerType === 'mouse') return;
      if (consumedPointerId === event.pointerId) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    onPointerCancel(event) {
      if (consumedPointerId === event.pointerId) {
        consumedPointerId = null;
      }
    },
    onClick(event) {
      if (isPointerClickThroughGuardActive()) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}

/** Document-level capture: swallow ghost clicks app-wide after overlay selection. */
export function installPointerClickThroughGuardCapture(): () => void {
  const onClick = (event: MouseEvent) => {
    if (!isPointerClickThroughGuardActive()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener('click', onClick as unknown as EventListener, true);
  return () => {
    document.removeEventListener('click', onClick as unknown as EventListener, true);
  };
}
