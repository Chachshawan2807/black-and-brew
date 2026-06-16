/** Shared framer-motion presets — premium minimal, layout-neutral */

/** Smooth deceleration — snappy enter/exit without spring bounce */
export const MODAL_EASE = [0.22, 1, 0.36, 1] as const;

export const fadeOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.14, ease: MODAL_EASE },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.98, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 6 },
  transition: { duration: 0.16, ease: MODAL_EASE },
};

export const sheetPanel = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

export const pageContent = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: MODAL_EASE },
};

export const toastSlide = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.18, ease: MODAL_EASE },
};
