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
