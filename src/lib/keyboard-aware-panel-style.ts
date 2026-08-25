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
};

/** Shift centered / bottom-sheet modals into the visible viewport when the keyboard opens. */
export function getModalBackdropKeyboardAwareStyle({
  insets,
  marginTop = 8,
  marginBottom = 8,
  marginHorizontal = 16,
}: ModalBackdropStyleOptions): CSSProperties {
  if (!insets.isKeyboardOpen) return {};

  return {
    display: 'flex',
    pointerEvents: 'none',
    alignItems: 'flex-start',
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
