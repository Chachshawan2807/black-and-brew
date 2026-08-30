import type { CSSProperties } from 'react';
import type { VisualViewportInsets } from '@/hooks/use-visual-viewport-insets';

type FabPanelStyleOptions = {
  insets: VisualViewportInsets;
  marginTop?: number;
  marginBottom?: number;
  defaultMaxHeight?: string;
};

/** Reposition bottom FAB panels above the software keyboard (phone, tablet, iPad). */
export function getFabPanelKeyboardAwareStyle({
  insets,
  marginTop = 8,
  marginBottom = 8,
  defaultMaxHeight = 'min(75vh, calc(100dvh - 12rem))',
}: FabPanelStyleOptions): CSSProperties {
  if (!insets.isKeyboardOpen) {
    return { maxHeight: defaultMaxHeight };
  }

  return {
    bottom: insets.bottomInset + marginBottom,
    maxHeight: Math.max(120, insets.visibleHeight - marginTop - marginBottom),
  };
}

type ModalBackdropStyleOptions = {
  insets: VisualViewportInsets;
  marginTop?: number;
  marginBottom?: number;
  marginHorizontal?: number;
  /** Vertical alignment inside the visible viewport when the keyboard is open. */
  verticalAlign?: 'start' | 'center';
};

/** Shift centered / bottom-sheet modals into the visible viewport when the keyboard opens. */
export function getModalBackdropKeyboardAwareStyle({
  insets,
  marginTop = 8,
  marginBottom = 8,
  marginHorizontal = 16,
  verticalAlign = 'start',
}: ModalBackdropStyleOptions): CSSProperties {
  if (!insets.isKeyboardOpen) return {};

  return {
    display: 'flex',
    pointerEvents: 'none',
    alignItems: verticalAlign === 'center' ? 'center' : 'flex-start',
    justifyContent: 'center',
    top: insets.offsetTop,
    bottom: 'auto',
    left: insets.offsetLeft,
    right: 'auto',
    width: insets.visibleWidth,
    paddingTop: marginTop,
    paddingBottom: marginBottom,
    paddingLeft: marginHorizontal,
    paddingRight: marginHorizontal,
    height: insets.visibleHeight,
    maxHeight: insets.visibleHeight,
    overflow: 'hidden',
  };
}

export function getModalContentKeyboardAwareStyle({
  insets,
  marginTop = 8,
  marginBottom = 16,
}: ModalBackdropStyleOptions): CSSProperties {
  if (!insets.isKeyboardOpen) return {};

  return {
    maxHeight: Math.max(120, insets.visibleHeight - marginTop - marginBottom),
  };
}

/** Estimated fixed chrome above the bulk queue scroll area (FAB mobile, keyboard closed). */
export const FAB_MOBILE_BULK_QUEUE_CHROME_FULL_PX = 290;

/** Estimated fixed chrome when the software keyboard is open (secondary row hidden). */
export const FAB_MOBILE_BULK_QUEUE_CHROME_KEYBOARD_PX = 200;

/** Cap FAB panel max-height for FAB bulk mode on phone. */
export function getFabMobileBulkPanelMaxHeight(
  insets: VisualViewportInsets,
  marginTop = 16,
  marginBottom = 16,
): number {
  if (insets.isKeyboardOpen && insets.visibleHeight > 0) {
    return Math.max(120, insets.visibleHeight - marginTop - marginBottom);
  }
  if (typeof window === 'undefined') return 560;
  const dvh = window.innerHeight;
  return Math.max(120, Math.min(dvh * 0.75, dvh - marginTop - marginBottom));
}

/** Scroll cap for the bulk queue list shrinks with keyboard, never exceeds panel chrome budget. */
export function getFabMobileBulkQueueListMaxHeight(
  insets: VisualViewportInsets,
  marginTop = 16,
  marginBottom = 16,
): number {
  const chromePx = insets.isKeyboardOpen
    ? FAB_MOBILE_BULK_QUEUE_CHROME_KEYBOARD_PX
    : FAB_MOBILE_BULK_QUEUE_CHROME_FULL_PX;
  const panelMax = getFabMobileBulkPanelMaxHeight(insets, marginTop, marginBottom);
  return Math.max(72, panelMax - chromePx);
}

/** FAB bulk panel on phone: always cap max-height so content cannot push the shell off-center. */
export function getFabMobileBulkPanelStyle(
  insets: VisualViewportInsets,
  marginTop = 16,
  marginBottom = 16,
): CSSProperties {
  return {
    maxHeight: getFabMobileBulkPanelMaxHeight(insets, marginTop, marginBottom),
  };
}

/** Mobile quick-action sheet: anchor to the visual viewport, not layout inset-0. */
export function getMobileQuickActionKeyboardSheetBackdropStyle(
  insets: VisualViewportInsets,
  margin = 8,
): CSSProperties {
  if (!insets.isKeyboardOpen) return {};

  return {
    position: 'fixed',
    top: insets.offsetTop,
    left: insets.offsetLeft,
    right: 'auto',
    bottom: 'auto',
    width: insets.visibleWidth,
    height: insets.visibleHeight,
    maxHeight: insets.visibleHeight,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    padding: margin,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
}

export function getMobileQuickActionKeyboardSheetPanelStyle(
  insets: VisualViewportInsets,
  margin = 8,
): CSSProperties {
  if (!insets.isKeyboardOpen) return {};

  return {
    width: '100%',
    maxHeight: Math.max(120, insets.visibleHeight - margin * 2),
    minHeight: 0,
    flex: '1 1 auto',
  };
}
