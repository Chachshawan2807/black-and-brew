import type { MouseEvent, PointerEvent } from 'react';

const DEFAULT_GUARD_MS = 450;

/** Squared px movement above which a touch sequence is treated as scroll, not tap. */
const OPTION_TOUCH_MOVE_THRESHOLD_SQ = 12 * 12;

type PendingOptionTouch = {
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLElement;
};

function isImmediateSelectPointer(pointerType: string): boolean {
  return pointerType === 'mouse' || pointerType === 'pen';
}

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
 * Select on pointerdown (mouse / pen) or pointerup after a stationary touch tap.
 * Activates click-through guard before onSelect so ghost clicks cannot reach controls below.
 */
export function bindPointerSafeOptionSelect(
  onSelect: () => void,
  options?: { onPointerDown?: () => void },
): PointerSafeOptionHandlers {
  let consumedPointerId: number | null = null;
  let pendingTouch: PendingOptionTouch | null = null;

  const runSelect = (pointerId: number) => {
    if (consumedPointerId === pointerId) return;
    consumedPointerId = pointerId;
    activatePointerClickThroughGuard();
    options?.onPointerDown?.();
    onSelect();
  };

  return {
    onPointerDown(event) {
      if (isImmediateSelectPointer(event.pointerType)) {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        runSelect(event.pointerId);
        return;
      }

      if (event.pointerType === 'touch') {
        pendingTouch = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          element: event.currentTarget,
        };
      }
    },
    onPointerUp(event) {
      if (isImmediateSelectPointer(event.pointerType)) {
        if (consumedPointerId === event.pointerId) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (event.pointerType !== 'touch' || !pendingTouch) return;
      if (pendingTouch.pointerId !== event.pointerId) return;

      const { startX, startY, element } = pendingTouch;
      pendingTouch = null;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (dx * dx + dy * dy > OPTION_TOUCH_MOVE_THRESHOLD_SQ) return;

      const target = event.target;
      if (!(target instanceof Node) || !element.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();
      runSelect(event.pointerId);
    },
    onPointerCancel(event) {
      if (pendingTouch?.pointerId === event.pointerId) {
        pendingTouch = null;
      }
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
