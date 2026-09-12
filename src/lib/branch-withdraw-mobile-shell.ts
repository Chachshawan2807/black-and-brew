import type { CSSProperties } from 'react';
import type { VisualViewportInsets } from '@/hooks/use-visual-viewport-insets';

/** Scroll-body padding when the software keyboard is open on standalone mobile. */
export function buildBranchWithdrawScrollBodyKeyboardStyle(options: {
  embedded: boolean;
  isMaxMd: boolean | null;
  viewportInsets: VisualViewportInsets;
}): CSSProperties | undefined {
  const { embedded, isMaxMd, viewportInsets } = options;
  if (embedded || isMaxMd !== true || !viewportInsets.isKeyboardOpen) return undefined;

  return {
    paddingBottom: Math.max(0, viewportInsets.bottomInset),
  };
}
