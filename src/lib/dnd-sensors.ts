import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Shared safe DnD sensors for mobile and desktop.
 *
 * - Desktop (mouse): requires 10px movement before drag activates — accidental
 *   clicks are not treated as drags.
 * - Mobile (touch): requires a 1-second long-press before drag activates so that
 *   normal page-scroll gestures are never hijacked.
 * - Keyboard: standard sortable keyboard navigation.
 */
export function useSafeDndSensors() {
  return useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 1000,
        // Allow natural finger micro-movement during the 1s long-press on mobile.
        tolerance: 12,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}
