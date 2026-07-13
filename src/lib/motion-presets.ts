/** Shared framer-motion presets — premium minimal, layout-neutral */

/** Smooth deceleration — snappy enter/exit without spring bounce */
export const MODAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type MotionPreset = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
  transition: { duration: number; ease: [number, number, number, number] };
};

export const fadeOverlay: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: MODAL_EASE },
};

export const modalContent: MotionPreset = {
  initial: { opacity: 0, scale: 0.98, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 6 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** Centered notification panel — slightly longer travel for smooth open/close */
export const notificationPanel: MotionPreset = {
  initial: { opacity: 0, scale: 0.94, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
  transition: { duration: 0.28, ease: MODAL_EASE },
};

export const notificationOverlay: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22, ease: MODAL_EASE },
};

export const sheetPanel: MotionPreset = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
  transition: { duration: 0.24, ease: MODAL_EASE },
};

export const pageContent: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.24, ease: MODAL_EASE },
};

export const sidebarSurface: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.28, ease: MODAL_EASE },
};

export const toastSlide: MotionPreset = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.18, ease: MODAL_EASE },
};

/** FAB stack triggers — soft fade + scale without bounce */
export const fabTrigger: MotionPreset = {
  initial: { opacity: 0, scale: 0.82, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.82, y: 8 },
  transition: { duration: 0.26, ease: MODAL_EASE },
};

/** Success / error inline banners */
export const statusBanner: MotionPreset = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** Upload success feedback inside forms */
export const uploadSuccessBanner: MotionPreset = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** Page section cards — use with staggerDelay for cascade */
export const sectionReveal: MotionPreset = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.24, ease: MODAL_EASE },
};

export const staggeredSection: MotionPreset = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.24, ease: MODAL_EASE },
};

/** Table/list row appear */
export const listRowReveal: MotionPreset = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** Staggered table rows / list items */
export const staggerListItem: MotionPreset = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** Header slide-in from the left */
export const slideInLeft: MotionPreset = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.24, ease: MODAL_EASE },
};

/** Collapsible panel height animation */
export const expandPanel: MotionPreset = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** FAB icon swap — open state */
export const fabIconOpen: MotionPreset = {
  initial: { rotate: -90, opacity: 0 },
  animate: { rotate: 0, opacity: 1 },
  exit: { rotate: 90, opacity: 0 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** FAB icon swap — close state */
export const fabIconClose: MotionPreset = {
  initial: { rotate: 90, opacity: 0 },
  animate: { rotate: 0, opacity: 1 },
  exit: { rotate: -90, opacity: 0 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

/** Floating toast sliding from bottom-right */
export const alertSlideIn: MotionPreset = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
  transition: { duration: 0.3, ease: MODAL_EASE },
};

/** Micro hint below inputs */
export const microFadeDown: MotionPreset = {
  initial: { opacity: 0, y: -2 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -2 },
  transition: { duration: 0.12, ease: MODAL_EASE },
};

/** Micro popover / badge */
export const microPopIn: MotionPreset = {
  initial: { opacity: 0, y: -4, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.95 },
  transition: { duration: 0.15, ease: MODAL_EASE },
};

/** Snappy spring for cards and headings */
export const SNAPPY_SPRING = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 };

export const pageHeadingSpring = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  transition: SNAPPY_SPRING,
};

export const listRowSpring = {
  initial: listRowReveal.initial,
  animate: listRowReveal.animate,
  transition: SNAPPY_SPRING,
};

export function staggerDelay(index: number, step = 0.03): number {
  return index * step;
}

export function applyMotionPreset(preset: MotionPreset) {
  return {
    initial: preset.initial,
    animate: preset.animate,
    exit: preset.exit,
    transition: preset.transition,
  };
}

/** Primary FAB / notification bell — hover & tap */
export const FAB_HOVER = { scale: 1.08 } as const;
export const FAB_TAP = { scale: 0.94 } as const;

/** Smaller hide-toggle on the FAB stack */
export const FAB_SUBTLE_HOVER = { scale: 1.06 } as const;

/** Standard CTA buttons */
export const BUTTON_HOVER = { scale: 1.02 } as const;
export const BUTTON_TAP = { scale: 0.98 } as const;

/** Dashboard stat cards — lift on hover */
export const CARD_LIFT_HOVER = {
  y: -4,
  scale: 1.02,
  transition: { duration: 0.2, ease: MODAL_EASE },
} as const;
export const CARD_PRESS_TAP = { scale: 0.98 } as const;

/** Compact icon buttons (chat send, etc.) */
export const ICON_COMPACT_TAP = { scale: 0.9 } as const;

/** Pin gateway — status line swap */
export const pinStatusText: MotionPreset = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.16, ease: MODAL_EASE },
};

export const pinVerifyingSpinner: MotionPreset = {
  initial: { opacity: 0, scale: 0.92, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -2 },
  transition: { duration: 0.18, ease: MODAL_EASE },
};

export const pinInputPanel: MotionPreset = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.16, ease: MODAL_EASE },
};

export const pinMessageFade: MotionPreset = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.16, ease: MODAL_EASE },
};

export const PIN_DIGIT_LAYOUT_TRANSITION = { duration: 0.2, ease: MODAL_EASE };

export const PIN_VERIFYING_LOCK_ANIMATE = {
  active: { scale: [1, 1.04, 1], opacity: [1, 0.88, 1] },
  idle: { scale: 1, opacity: 1 },
};

export function pinVerifyingLockTransition(isVerifying: boolean) {
  return {
    duration: 1.8,
    repeat: isVerifying ? Infinity : 0,
    ease: 'easeInOut' as const,
  };
}

/** Instant motion when the user prefers reduced motion */
export function withReducedMotion(preset: MotionPreset, reduced: boolean): MotionPreset {
  if (!reduced) return preset;
  return {
    initial: preset.animate,
    animate: preset.animate,
    exit: preset.animate,
    transition: { duration: 0.01, ease: MODAL_EASE },
  };
}
