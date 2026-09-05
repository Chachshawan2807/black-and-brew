'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloseIcon } from '@/components/ui/close-icon';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import { CheckCircle2, CloudOff, ICON_STROKE, Trash2 } from '@/lib/icons';
import {
  fadeOverlay,
  fabIconClose,
  fabIconOpen,
  microFadeDown,
  microPopIn,
  modalContent,
  modalSheetBottom,
  sectionReveal,
  withReducedMotion,
} from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  BB_BTN_CLOSE,
  BB_BTN_ICON,
  BB_BTN_ICON_ACTIVE,
  BB_BTN_MOTION,
  BB_BTN_OUTLINE,
  BB_BTN_OUTLINE_DANGER,
  BB_BTN_OUTLINE_PRIMARY,
  BB_ICON_BADGE_BASE,
  BB_RADIUS_SOFT,
} from '@/lib/ui-outlined-tokens';

/** Respect reduced motion on Tailwind enter/exit utilities. */
export const INVENTORY_MOTION_SAFE =
  'motion-reduce:animate-none motion-reduce:transition-none motion-reduce:transform-none';

export const INVENTORY_MODAL_OVERLAY =
  'bg-black/25 backdrop-blur-[4px] md:backdrop-blur-[6px]';

export const INVENTORY_MODAL_PANEL =
  'relative bg-card border border-border text-foreground flex flex-col overflow-hidden bb-shadow-xl';

export const INVENTORY_MODAL_PANEL_SHEET =
  'rounded-t-[28px] md:rounded-3xl w-full max-h-[85dvh] pb-[env(safe-area-inset-bottom)]';

export const INVENTORY_ICON_BUTTON = BB_BTN_ICON;

export const INVENTORY_ICON_BUTTON_ACTIVE = BB_BTN_ICON_ACTIVE;

export const INVENTORY_SECONDARY_ACTION =
  `flex w-full items-center justify-center gap-1.5 h-11 ${BB_RADIUS_SOFT} text-base md:text-sm font-normal antialiased border border-border/80 bg-card hover:bg-muted/40 bb-transition duration-200 hover:bb-shadow-hover-md active:scale-[0.98] motion-reduce:active:scale-100`;

export const INVENTORY_PASTEL_ACTION =
  'bb-pastel-surface shrink-0 inline-flex h-[3.25rem] sm:h-auto sm:min-h-[3.25rem] w-full sm:w-auto items-center justify-center gap-2 rounded-3xl border px-4 text-sm font-normal text-black bb-shadow-sm bb-transition duration-200 hover:brightness-[0.98] active:scale-[0.99] motion-reduce:active:scale-100';

export const INVENTORY_FORM_LABEL =
  'text-[12px] font-normal text-muted-foreground ml-1 uppercase tracking-wider';

export const INVENTORY_BTN_PRIMARY = BB_BTN_OUTLINE_PRIMARY;

export const INVENTORY_BTN_SECONDARY = BB_BTN_OUTLINE;

export type InventoryIconTone = 'neutral' | 'accent' | 'warn' | 'inventory';

const INVENTORY_ICON_TONE_CLASS: Record<InventoryIconTone, string> = {
  neutral: 'border-border/70 bg-muted/25 text-foreground/70',
  accent: 'border-emerald-500/20 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300',
  warn: 'border-amber-500/25 bg-amber-50/70 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300',
  inventory: 'border-border/60 bg-muted/20 text-foreground/45',
};

export type InventorySavingState = 'idle' | 'saving' | 'synced' | 'queued';

export function useInventoryMotion() {
  const reduced = usePrefersReducedMotion();
  return {
    reduced,
    overlay: withReducedMotion(fadeOverlay, reduced),
    panel: withReducedMotion(modalContent, reduced),
    sheet: withReducedMotion(modalSheetBottom, reduced),
    section: withReducedMotion(sectionReveal, reduced),
    micro: withReducedMotion(microPopIn, reduced),
    microFade: withReducedMotion(microFadeDown, reduced),
    fabOpen: withReducedMotion(fabIconOpen, reduced),
    fabClose: withReducedMotion(fabIconClose, reduced),
  };
}

type InventoryIconBadgeProps = {
  children: ReactNode;
  tone?: InventoryIconTone;
  size?: 'md' | 'lg';
  className?: string;
};

export function InventoryIconBadge({
  children,
  tone = 'neutral',
  size = 'md',
  className,
}: InventoryIconBadgeProps) {
  return (
    <div
      className={cn(
        BB_ICON_BADGE_BASE,
        size === 'lg' ? 'h-11 w-11' : 'h-9 w-9',
        INVENTORY_ICON_TONE_CLASS[tone],
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

type InventoryModalCloseButtonProps = {
  onClose: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function InventoryModalCloseButton({
  onClose,
  disabled = false,
  label = 'ปิด',
  className,
}: InventoryModalCloseButtonProps) {
  return (
    <HintTooltip tip={label}>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className={cn(BB_BTN_CLOSE, 'absolute top-4 right-4 z-10', className)}
        aria-label={label}
      >
        <CloseIcon />
      </button>
    </HintTooltip>
  );
}

export function InventoryMobileSheetHandle() {
  return (
    <div className="mx-auto mb-3 flex justify-center md:hidden" aria-hidden>
      <span className="h-1 w-10 rounded-full bg-foreground/12" />
    </div>
  );
}

type InventoryModalHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  tone?: InventoryIconTone;
  onClose?: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  className?: string;
  sheet?: boolean;
};

export function InventoryModalHeader({
  icon,
  title,
  subtitle,
  tone = 'inventory',
  onClose,
  closeDisabled,
  closeLabel,
  className,
  sheet = true,
}: InventoryModalHeaderProps) {
  const { section, reduced } = useInventoryMotion();

  return (
    <div
      className={cn(
        'relative shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-4 md:px-6 md:py-5 pr-14',
        className,
      )}
    >
      {onClose ? (
        <InventoryModalCloseButton
          onClose={onClose}
          disabled={closeDisabled}
          label={closeLabel}
        />
      ) : null}
      {sheet ? <InventoryMobileSheetHandle /> : null}
      <motion.div
        className="flex items-start gap-3"
        initial={section.initial}
        animate={section.animate}
        transition={{ ...section.transition, delay: reduced ? 0 : 0.03 }}
      >
        <InventoryIconBadge tone={tone} size="lg">
          {icon}
        </InventoryIconBadge>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-lg md:text-xl font-normal text-foreground tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-[12px] md:text-[13px] leading-relaxed text-muted-foreground max-w-[32rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

type InventorySyncStatusProps = {
  state: InventorySavingState;
  className?: string;
};

export function InventorySyncStatus({ state, className }: InventorySyncStatusProps) {
  const { microFade, reduced } = useInventoryMotion();

  return (
    <div
      className={cn('flex items-center gap-1.5 text-sm font-normal min-w-[70px] min-h-[1.25rem]', className)}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'saving' ? (
          <motion.span
            key="saving"
            className="inline-flex items-center gap-1.5 text-foreground"
            initial={microFade.initial}
            animate={microFade.animate}
            exit={microFade.exit}
            transition={{ ...microFade.transition, delay: reduced ? 0 : 0 }}
          >
            <LoadingIcon size="sm" className="text-foreground" />
            <span>กำลังซิงค์ข้อมูลอยู่ค่ะ</span>
          </motion.span>
        ) : null}
        {state === 'synced' ? (
          <motion.span
            key="synced"
            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
            initial={microFade.initial}
            animate={microFade.animate}
            exit={microFade.exit}
            transition={microFade.transition}
          >
            <CheckCircle2 size={14} strokeWidth={ICON_STROKE} aria-hidden />
            <span>ซิงค์ข้อมูลแล้วค่ะ</span>
          </motion.span>
        ) : null}
        {state === 'queued' ? (
          <motion.span
            key="queued"
            className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
            initial={microFade.initial}
            animate={microFade.animate}
            exit={microFade.exit}
            transition={microFade.transition}
          >
            <CloudOff size={14} strokeWidth={ICON_STROKE} aria-hidden />
            <span>รอส่งข้อมูลเมื่อออนไลน์</span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type InventoryIconButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
  active?: boolean;
  className?: string;
};

export function InventoryIconButton({
  onClick,
  disabled,
  label,
  children,
  active = false,
  className,
}: InventoryIconButtonProps) {
  return (
    <HintTooltip tip={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          INVENTORY_ICON_BUTTON,
          active && INVENTORY_ICON_BUTTON_ACTIVE,
          className,
        )}
      >
        {children}
      </button>
    </HintTooltip>
  );
}

type InventoryEmptyStateProps = {
  icon: ReactNode;
  message: string;
  className?: string;
};

export function InventoryEmptyState({ icon, message, className }: InventoryEmptyStateProps) {
  return (
    <div
      className={cn(
        'p-8 text-center text-base font-normal text-muted-foreground bg-card border border-border',
        BB_RADIUS_SOFT,
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto mb-3 flex h-12 w-12 items-center justify-center text-muted-foreground/30',
          INVENTORY_MOTION_SAFE,
          'animate-in fade-in zoom-in-95 duration-300',
        )}
        aria-hidden
      >
        {icon}
      </div>
      <p>{message}</p>
    </div>
  );
}

type DeleteConfirmDialogProps = {
  deleteId: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({ onCancel, onConfirm }: DeleteConfirmDialogProps) {
  const { overlay, panel } = useInventoryMotion();

  return (
    <motion.div
      initial={overlay.initial}
      animate={overlay.animate}
      exit={overlay.exit}
      transition={overlay.transition}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        INVENTORY_MODAL_OVERLAY,
      )}
    >
      <motion.div
        initial={panel.initial}
        animate={panel.animate}
        exit={panel.exit}
        transition={panel.transition}
        className={cn(INVENTORY_MODAL_PANEL, `${BB_RADIUS_SOFT} w-full max-w-sm p-6 text-center`)}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="inventory-delete-title"
        aria-describedby="inventory-delete-desc"
      >
        <InventoryModalCloseButton onClose={onCancel} label="ปิด" />
        <InventoryIconBadge tone="warn" size="lg" className="mx-auto mb-4 mt-2 border-red-200/80 bg-red-50/80 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <Trash2 className="w-5 h-5" strokeWidth={ICON_STROKE} />
        </InventoryIconBadge>
        <h3 id="inventory-delete-title" className="text-lg font-normal text-foreground mb-2">
          ต้องการลบรายการนี้ใช่หรือไม่?
        </h3>
        <p id="inventory-delete-desc" className="text-sm font-normal text-muted-foreground mb-6">
          ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={cn(INVENTORY_BTN_SECONDARY, 'flex-1 py-3')}>
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(BB_BTN_OUTLINE_DANGER, 'flex-1 py-3')}
          >
            ลบรายการ
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
