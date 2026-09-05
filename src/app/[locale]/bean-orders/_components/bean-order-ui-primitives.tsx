'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CloseIcon } from '@/components/ui/close-icon';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Coffee,
  ICON_STROKE,
} from '@/lib/icons';
import {
  listRowReveal,
  microFadeDown,
  pageContent,
  pageHeadingSpring,
  sectionReveal,
  staggerDelay,
  statusBanner,
  withReducedMotion,
} from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { BB_BTN_CLOSE, BB_ICON_BADGE_BASE, BB_ICON_BADGE_FILL, BB_RADIUS_SOFT } from '@/lib/ui-outlined-tokens';
import { BEAN_ORDER_BTN_ICON } from './bean-order-layout';

export const BEAN_ORDER_MOTION_SAFE =
  'motion-reduce:animate-none motion-reduce:transition-none motion-reduce:transform-none';

export const BEAN_ORDER_MODAL_OVERLAY = 'bg-black/25 backdrop-blur-[4px] md:backdrop-blur-[6px]';

export const BEAN_ORDER_MODAL_PANEL =
  'relative bg-card border border-border text-foreground flex flex-col overflow-hidden bb-shadow-xl rounded-2xl w-full';

export const BEAN_ORDER_MODAL_PANEL_SHEET =
  'rounded-t-[28px] md:rounded-2xl w-full max-h-[85dvh] pb-[env(safe-area-inset-bottom)]';

export type BeanOrderIconTone =
  | 'neutral'
  | 'coffee'
  | 'payment'
  | 'shipping'
  | 'success'
  | 'warn';

const BEAN_ORDER_ICON_TONE_CLASS: Record<BeanOrderIconTone, string> = {
  neutral: BB_ICON_BADGE_FILL.neutral,
  coffee: BB_ICON_BADGE_FILL.coffee,
  payment: BB_ICON_BADGE_FILL.payment,
  shipping: BB_ICON_BADGE_FILL.shipping,
  success: BB_ICON_BADGE_FILL.success,
  warn: BB_ICON_BADGE_FILL.warn,
};

export function useBeanOrderMotion() {
  const reduced = usePrefersReducedMotion();
  return {
    reduced,
    page: withReducedMotion(pageContent, reduced),
    heading: pageHeadingSpring,
    section: withReducedMotion(sectionReveal, reduced),
    row: withReducedMotion(listRowReveal, reduced),
    banner: withReducedMotion(statusBanner, reduced),
    micro: withReducedMotion(microFadeDown, reduced),
  };
}

type BeanOrderIconBadgeProps = {
  children: ReactNode;
  tone?: BeanOrderIconTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function BeanOrderIconBadge({
  children,
  tone = 'neutral',
  size = 'md',
  className,
}: BeanOrderIconBadgeProps) {
  const sizeClass =
    size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-7 w-7 rounded-xl' : 'h-9 w-9 rounded-xl';

  return (
    <div
      className={cn(
        BB_ICON_BADGE_BASE,
        sizeClass,
        BEAN_ORDER_ICON_TONE_CLASS[tone],
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}

type BeanOrderModalCloseButtonProps = {
  onClose: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function BeanOrderModalCloseButton({
  onClose,
  disabled = false,
  label = 'ปิด',
  className,
}: BeanOrderModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={disabled}
      title={label}
      className={cn(BB_BTN_CLOSE, 'absolute top-4 right-4 z-10', className)}
      aria-label={label}
    >
      <CloseIcon />
    </button>
  );
}

export function BeanOrderMobileSheetHandle() {
  return (
    <div className="mx-auto mb-3 flex justify-center md:hidden" aria-hidden>
      <span className="h-1 w-10 rounded-full bg-foreground/12" />
    </div>
  );
}

type BeanOrderModalHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  tone?: BeanOrderIconTone;
  onClose?: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  className?: string;
  sheet?: boolean;
};

export function BeanOrderModalHeader({
  icon,
  title,
  subtitle,
  tone = 'coffee',
  onClose,
  closeDisabled,
  closeLabel,
  className,
  sheet = true,
}: BeanOrderModalHeaderProps) {
  const { section, reduced } = useBeanOrderMotion();

  return (
    <div
      className={cn(
        'relative shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-4 md:px-5 md:py-5 pr-14',
        className,
      )}
    >
      {onClose ? (
        <BeanOrderModalCloseButton onClose={onClose} disabled={closeDisabled} label={closeLabel} />
      ) : null}
      {sheet ? <BeanOrderMobileSheetHandle /> : null}
      <motion.div
        className="flex items-start gap-3"
        initial={section.initial}
        animate={section.animate}
        transition={{ ...section.transition, delay: reduced ? 0 : 0.03 }}
      >
        <BeanOrderIconBadge tone={tone} size="lg">
          {icon}
        </BeanOrderIconBadge>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-base md:text-lg font-normal text-foreground tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs md:text-[13px] leading-relaxed text-muted-foreground max-w-[32rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

type BeanOrderStatusBannerProps = {
  message: string;
  variant?: 'success' | 'error' | 'info';
  className?: string;
};

export function BeanOrderStatusBanner({
  message,
  variant = 'info',
  className,
}: BeanOrderStatusBannerProps) {
  const { banner } = useBeanOrderMotion();

  const variantClass =
    variant === 'error'
      ? 'border-red-200/80 bg-red-50/90 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
      : variant === 'success'
        ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'border-border bg-card text-foreground';

  const icon =
    variant === 'error' ? (
      <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
    ) : variant === 'success' ? (
      <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
    ) : (
      <Coffee className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
    );

  return (
    <motion.div
      initial={banner.initial}
      animate={banner.animate}
      exit={banner.exit}
      transition={banner.transition}
      className={cn(
        'mb-3 flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm',
        variantClass,
        className,
      )}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {icon}
      <span className="min-w-0 flex-1 leading-snug">{message}</span>
    </motion.div>
  );
}

type BeanOrderEmptyStateProps = {
  icon?: ReactNode;
  message: string;
  className?: string;
};

export function BeanOrderEmptyState({
  icon,
  message,
  className,
}: BeanOrderEmptyStateProps) {
  return (
    <div className={cn('p-10 text-center', className)}>
      <div
        className={cn(
          'mx-auto mb-3 flex h-12 w-12 items-center justify-center text-muted-foreground/35',
          BEAN_ORDER_MOTION_SAFE,
          'animate-in fade-in zoom-in-95 duration-300',
        )}
        aria-hidden
      >
        {icon ?? <Coffee className="h-8 w-8" strokeWidth={ICON_STROKE} />}
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

type BeanOrderBackLinkProps = {
  href?: string;
  onClick?: () => void;
  label: string;
  className?: string;
};

export function BeanOrderBackLink({ href, onClick, label, className }: BeanOrderBackLinkProps) {
  const linkClass = cn(
    'mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground bb-transition hover:text-foreground active:scale-[0.98] motion-reduce:active:scale-100',
    className,
  );

  const content = (
    <>
      <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
      {label}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={linkClass}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? '#'} className={linkClass}>
      {content}
    </Link>
  );
}

type BeanOrderPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function BeanOrderPageShell({ children, className }: BeanOrderPageShellProps) {
  const { page } = useBeanOrderMotion();

  return (
    <motion.div
      className={className}
      initial={page.initial}
      animate={page.animate}
      transition={page.transition}
    >
      {children}
    </motion.div>
  );
}

type BeanOrderSectionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function BeanOrderSectionReveal({ children, className, delay = 0 }: BeanOrderSectionRevealProps) {
  const { section, reduced } = useBeanOrderMotion();

  return (
    <motion.section
      className={className}
      initial={section.initial}
      animate={section.animate}
      transition={{ ...section.transition, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.section>
  );
}

type BeanOrderListRowMotionProps = {
  children: ReactNode;
  index: number;
  className?: string;
};

export function BeanOrderListRowMotion({ children, index, className }: BeanOrderListRowMotionProps) {
  const { row, reduced } = useBeanOrderMotion();

  return (
    <motion.li
      className={className}
      initial={row.initial}
      animate={row.animate}
      transition={{ ...row.transition, delay: reduced ? 0 : staggerDelay(index, 0.025) }}
    >
      {children}
    </motion.li>
  );
}

type BeanOrderIconButtonProps = {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
  className?: string;
};

export function BeanOrderIconButton({
  onClick,
  disabled,
  label,
  children,
  className,
}: BeanOrderIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(BEAN_ORDER_BTN_ICON, 'h-11 w-11 min-h-[44px] min-w-[44px]', className)}
    >
      {children}
    </button>
  );
}

type BeanOrderDialogShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  panelVariant?: 'center' | 'sheet';
  keyboardAware?: boolean;
  centerScrollable?: boolean;
  layoutClassName?: string;
  'aria-label'?: string;
};

export function BeanOrderDialogShell({
  open,
  onClose,
  children,
  panelClassName,
  panelVariant = 'center',
  keyboardAware = true,
  centerScrollable = true,
  layoutClassName,
  'aria-label': ariaLabel,
}: BeanOrderDialogShellProps) {
  return (
    <FadeModalScaffold
      open={open}
      onClose={onClose}
      overlayClassName={BEAN_ORDER_MODAL_OVERLAY}
      panelClassName={cn(
        BEAN_ORDER_MODAL_PANEL,
        panelVariant === 'sheet' && BEAN_ORDER_MODAL_PANEL_SHEET,
        panelClassName,
      )}
      panelVariant={panelVariant}
      keyboardAware={keyboardAware}
      centerScrollable={centerScrollable}
      layoutClassName={layoutClassName}
      aria-label={ariaLabel}
    >
      {children}
    </FadeModalScaffold>
  );
}

type BeanOrderInlineLoadingProps = {
  label: string;
  className?: string;
};

export function BeanOrderInlineLoading({ label, className }: BeanOrderInlineLoadingProps) {
  const { micro } = useBeanOrderMotion();

  return (
    <motion.div
      className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
      initial={micro.initial}
      animate={micro.animate}
      transition={micro.transition}
      role="status"
    >
      <LoadingIcon size="md" />
      <span>{label}</span>
    </motion.div>
  );
}

type BeanOrderPageLoadingProps = {
  label?: string;
  className?: string;
};

export function BeanOrderPageLoading({
  label = 'กำลังโหลด...',
  className,
}: BeanOrderPageLoadingProps) {
  return (
    <div className={cn('flex min-h-[50svh] items-center justify-center', className)}>
      <BeanOrderInlineLoading label={label} />
    </div>
  );
}

type BeanOrderStatusMessagesProps = {
  message?: string | null;
  error?: string | null;
  className?: string;
};

export function BeanOrderStatusMessages({ message, error, className }: BeanOrderStatusMessagesProps) {
  return (
    <AnimatePresence mode="sync">
      {message ? (
        <BeanOrderStatusBanner key="message" message={message} variant="success" className={className} />
      ) : null}
      {error ? (
        <BeanOrderStatusBanner key="error" message={error} variant="error" className={className} />
      ) : null}
    </AnimatePresence>
  );
}
