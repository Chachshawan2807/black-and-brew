import type { MouseEvent, PointerEvent } from 'react';

const DEFAULT_GUARD_MS = 450;

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
 * Select on pointerup so overlays can stay mounted through the full touch gesture.
 * Prevents iOS ghost clicks from hitting controls revealed under the finger.
 */
export function bindPointerSafeOptionSelect(
  onSelect: () => void,
  options?: { onPointerDown?: () => void },
): PointerSafeOptionHandlers {
  let activePointerId: number | null = null;

  return {
    onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      options?.onPointerDown?.();
      activePointerId = event.pointerId;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // JSDOM / unsupported environments
      }
    },
    onPointerUp(event) {
      if (activePointerId === null || event.pointerId !== activePointerId) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      activePointerId = null;
      activatePointerClickThroughGuard();
      onSelect();
    },
    onPointerCancel() {
      activePointerId = null;
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
