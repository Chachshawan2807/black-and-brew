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
};

/** Shift centered / bottom-sheet modals into the visible viewport when the keyboard opens. */
export function getModalBackdropKeyboardAwareStyle({
  insets,
  marginTop = 8,
  marginBottom = 8,
}: ModalBackdropStyleOptions): CSSProperties {
  if (!insets.isKeyboardOpen) return {};

  return {
    alignItems: 'flex-start',
    justifyContent: 'center',
    top: insets.offsetTop,
    bottom: 'auto',
    left: 0,
    right: 0,
    width: '100%',
    paddingTop: marginTop,
    paddingBottom: marginBottom,
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
    maxHeight: Math.max(120, insets.visibleHeight - insets.offsetTop - marginTop - marginBottom),
  };
}
