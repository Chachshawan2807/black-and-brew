/** Step quick-action quantity by ±1; empty string means 0 in DB, shown as blank in UI. */

import type { WheelEvent } from 'react';

export function stepQuickQtyValue(current: string, delta: number): string {
  const trimmed = current.trim();
  const parsed = trimmed === '' ? 0 : Number(trimmed);
  if (Number.isNaN(parsed)) return current;

  const next = Math.max(0, parsed + delta);
  if (next === 0) return '';

  return Number.isInteger(next) ? String(next) : String(Number(next.toFixed(2)));
}

/** Blur focused number inputs on wheel so page scroll does not change qty. */
export function blurQtyInputOnWheel(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}
