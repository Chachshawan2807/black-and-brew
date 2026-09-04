import type { CSSProperties } from 'react';
import type { VisualViewportInsets } from '@/hooks/use-visual-viewport-insets';

/** Mobile standalone shell overrides when the on-screen keyboard is open. */
export function buildBranchWithdrawStandaloneMobileShellStyle(options: {
  embedded: boolean;
  isMaxMd: boolean | null;
  viewportInsets: VisualViewportInsets;
}): CSSProperties | undefined {
  const { embedded, isMaxMd, viewportInsets } = options;
  if (embedded || isMaxMd !== true || !viewportInsets.isKeyboardOpen) return undefined;

  return {
    top: viewportInsets.offsetTop,
    bottom: Math.max(0, viewportInsets.bottomInset),
  };
}
