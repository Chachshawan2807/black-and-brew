import type { CSSProperties } from 'react';
import type { VisualViewportInsets } from '@/hooks/use-visual-viewport-insets';

export const BRANCH_WITHDRAW_MOBILE_HEADER_TOP_PX = 72;

/** Mobile standalone shell overrides (keyboard only; FAB stack overlays content). */
export function buildBranchWithdrawStandaloneMobileShellStyle(options: {
  embedded: boolean;
  isMaxMd: boolean | null;
  viewportInsets: VisualViewportInsets;
}): CSSProperties | undefined {
  const { embedded, isMaxMd, viewportInsets } = options;
  if (embedded || isMaxMd !== true || !viewportInsets.isKeyboardOpen) return undefined;

  return {
    top: BRANCH_WITHDRAW_MOBILE_HEADER_TOP_PX + viewportInsets.offsetTop,
    bottom: Math.max(0, viewportInsets.bottomInset),
  };
}
