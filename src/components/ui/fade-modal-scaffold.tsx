'use client';

import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeOverlay, modalContent, modalSheetBottom, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';

type FadeModalScaffoldProps = {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  zIndex?: number;
  overlayClassName?: string;
  panelClassName?: string;
  layoutClassName?: string;
  layoutStyle?: CSSProperties;
  panelStyle?: CSSProperties;
  /** Scrollable outer shell so centered panels stay reachable on short viewports. */
  centerScrollable?: boolean;
  /** Reposition into the visible viewport when the software keyboard opens (mobile). */
  keyboardAware?: boolean;
  panelOnClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Center fade/scale (default) or bottom sheet slide on mobile-friendly panels */
  panelVariant?: 'center' | 'sheet';
  'aria-label'?: string;
};

export function FadeModalScaffold({
  open,
  onClose,
  children,
  zIndex = 50,
  overlayClassName,
  panelClassName,
  layoutClassName,
  layoutStyle,
  panelStyle,
  centerScrollable = false,
  keyboardAware = false,
  panelOnClick,
  panelVariant = 'center',
  'aria-label': ariaLabel,
}: FadeModalScaffoldProps) {
  const reduced = usePrefersReducedMotion();
  const overlay = withReducedMotion(fadeOverlay, reduced);
  const panelPreset = panelVariant === 'sheet' ? modalSheetBottom : modalContent;
  const panel = withReducedMotion(panelPreset, reduced);
  const viewportInsets = useVisualViewportInsets(open && keyboardAware);
  const keyboardLayoutStyle = keyboardAware
    ? getModalBackdropKeyboardAwareStyle({
        insets: viewportInsets,
        verticalAlign: 'center',
      })
    : {};
  const keyboardPanelStyle = keyboardAware
    ? getModalContentKeyboardAwareStyle({ insets: viewportInsets })
    : {};

  const resolvedLayoutStyle: CSSProperties = {
    zIndex: zIndex + 1,
    ...layoutStyle,
    ...keyboardLayoutStyle,
  };
  const resolvedPanelStyle: CSSProperties = {
    ...panelStyle,
    ...keyboardPanelStyle,
  };

  const defaultLayoutClass =
    'items-end justify-center md:items-center p-0 md:p-4';
  const layoutShellClassName = centerScrollable
    ? 'fixed inset-0 overflow-y-auto overscroll-contain bb-smooth-scroll pointer-events-none'
    : cn('fixed inset-0 flex pointer-events-none', layoutClassName ?? defaultLayoutClass);

  const layoutInnerClassName = centerScrollable
    ? cn(
        'flex min-h-full min-w-0 w-full pointer-events-none',
        layoutClassName ?? 'items-center justify-center p-4',
      )
    : undefined;

  const panelClass = cn(
    'pointer-events-auto',
    centerScrollable && 'my-auto min-h-0 w-full',
    panelClassName,
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="fade-modal-backdrop"
            className={cn(
              'fixed inset-0',
              overlayClassName ?? 'bg-black/20 backdrop-blur-sm',
            )}
            style={{ zIndex }}
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            onClick={onClose}
            aria-hidden
          />
          <div className={layoutShellClassName} style={resolvedLayoutStyle}>
            {centerScrollable ? (
              <div className={layoutInnerClassName}>
                <motion.div
                  key="fade-modal-panel"
                  className={panelClass}
                  style={resolvedPanelStyle}
                  initial={panel.initial}
                  animate={panel.animate}
                  exit={panel.exit}
                  transition={panel.transition}
                  onClick={panelOnClick}
                  role="dialog"
                  aria-label={ariaLabel}
                  aria-modal="true"
                >
                  {children}
                </motion.div>
              </div>
            ) : (
              <motion.div
                key="fade-modal-panel"
                className={panelClass}
                style={resolvedPanelStyle}
                initial={panel.initial}
                animate={panel.animate}
                exit={panel.exit}
                transition={panel.transition}
                onClick={panelOnClick}
                role="dialog"
                aria-label={ariaLabel}
                aria-modal="true"
              >
                {children}
              </motion.div>
            )}
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
