import { getViewportBounds, VIEWPORT_EDGE_GAP } from '@/lib/floating-position';

const ANCHOR_GAP_PX = 12;

/**
 * IRON RULE: schedule grid shift picker must use these helpers plus
 * shift-picker-layout.ts classes. Never clamp top with viewport height alone;
 * always subtract measured menuHeight. List uses h-max with viewport maxHeight
 * fallback scroll (see schedule-shift-picker-layout.test.ts).
 */

/** Max panel height from an anchored top so the full menu can stay on screen. */
export function getScheduleShiftPickerMaxHeight(
  menuTop: number,
  gap = VIEWPORT_EDGE_GAP,
): number {
  const bounds = getViewportBounds(gap);
  return Math.max(0, bounds.top + bounds.height - menuTop);
}

/**
 * Position the schedule shift picker below the click anchor, clamped so the
 * full menu height stays inside the visible viewport (list scrolls inside).
 */
export function getScheduleShiftPickerPosition(
  anchorX: number,
  anchorY: number,
  menuWidth: number,
  menuHeight: number,
  gap = VIEWPORT_EDGE_GAP,
): { left: number; top: number } {
  const bounds = getViewportBounds(gap);

  let left = anchorX;
  const spaceRight = bounds.left + bounds.width - anchorX;
  if (spaceRight < menuWidth + ANCHOR_GAP_PX) {
    left = anchorX - menuWidth;
  }
  left = Math.max(bounds.left, Math.min(left, bounds.left + bounds.width - menuWidth));

  let top = anchorY + ANCHOR_GAP_PX;
  const maxTop = bounds.top + bounds.height - menuHeight;
  top = Math.max(bounds.top, Math.min(top, maxTop));

  return { left, top };
}