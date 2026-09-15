import { describe, expect, test } from 'vitest';
import {
  modalContent,
  notificationPanel,
  toFramerPhaseVariants,
  MODAL_EXIT_EASE,
  MOTION_DURATION,
} from '@/lib/motion-presets';

describe('toFramerPhaseVariants (emil-design-eng ERP)', () => {
  test('uses faster exit easing when motion is allowed', () => {
    const phases = toFramerPhaseVariants(notificationPanel, false);
    expect(phases.exit.transition?.ease).toEqual(MODAL_EXIT_EASE);
    expect(phases.exit.transition?.duration).toBe(MOTION_DURATION.fast);
    expect(phases.animate.transition?.duration).toBe(notificationPanel.transition.duration);
  });

  test('collapses to still frame when reduced motion', () => {
    const phases = toFramerPhaseVariants(modalContent, true);
    expect(phases.initial).toEqual(phases.animate);
    expect(phases.exit).toEqual(phases.animate);
  });
});
