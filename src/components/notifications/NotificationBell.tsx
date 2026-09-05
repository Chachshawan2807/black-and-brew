'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Bell } from '@/lib/icons';
import { motion } from 'framer-motion';
import { FAB_HOVER, FAB_TAP } from '@/lib/motion-presets';
import { cn } from '@/lib/utils';
import { formatInAppBadgeLabel, getInAppBadgeClassName } from '@/lib/notification-badge';
import { FAB_SIZE_CLASS, FAB_RIGHT_CLASS, FAB_STACK_INNER_CLASS } from '@/lib/floating-action-layout';
import { INVENTORY_QUICK_ACTION_COLORS, INVENTORY_QUICK_ACTION_HOVER } from '@/lib/shift-colors';
import { INVENTORY_NOTIFICATION_EVENT } from '@/lib/pwa-notification-bridge';
import { useNotificationState, useNotificationActions } from '@/components/notifications/NotificationProvider';
import { HintTooltip } from '@/components/ui/hint-tooltip';

type NotificationBellProps = {
  variant?: 'sidebar' | 'fab';
  className?: string;
  /** When true, omits fixed positioning (parent FabFadePresence handles layout) */
  stacked?: boolean;
};

export function NotificationBell({ variant = 'sidebar', className, stacked = false }: NotificationBellProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const isTh = locale === 'th';
  const { unreadCount, panelOpen } = useNotificationState();
  const { openPanel, closePanel } = useNotificationActions();
  const [pulse, setPulse] = useState(false);
  const isFab = variant === 'fab';

  useEffect(() => {
    const handler = () => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    };

    window.addEventListener(INVENTORY_NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(INVENTORY_NOTIFICATION_EVENT, handler);
  }, []);

  const sharedProps = {
    type: 'button' as const,
    onClick: () => (panelOpen ? closePanel() : openPanel()),
    'aria-label':
      unreadCount > 0
        ? `การแจ้งเตือน ${unreadCount} รายการใหม่`
        : 'การแจ้งเตือน',
  };

  const content = (
    <>
      <Bell
        className={cn(
          isFab ? 'text-black' : 'h-[18px] w-[18px] text-foreground/80',
        )}
        size={isFab ? 20 : 18}
        strokeWidth={isFab ? 1.65 : 1.75}
        aria-hidden={isFab}
      />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className={cn(
            'absolute flex items-center justify-center rounded-full font-medium tabular-nums',
            'bg-red-500 text-white border-2 border-background bb-shadow-sm',
            isFab ? '-top-1 -right-1' : '-top-0.5 -right-0.5',
            getInAppBadgeClassName(unreadCount),
            pulse && 'animate-pulse ring-2 ring-red-400/50 ring-offset-1 ring-offset-transparent',
          )}
        >
          {formatInAppBadgeLabel(unreadCount)}
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {unreadCount > 0
          ? isTh
            ? `การแจ้งเตือน ${unreadCount} รายการใหม่`
            : `${unreadCount} new notifications`
          : ''}
      </span>
    </>
  );

  const bellTip =
    unreadCount > 0
      ? `การแจ้งเตือน (${unreadCount} ใหม่)`
      : 'การแจ้งเตือน';

  if (isFab) {
    return (
      <HintTooltip tip={bellTip} side="left">
        <motion.button
          {...sharedProps}
          aria-expanded={panelOpen}
          whileHover={FAB_HOVER}
          whileTap={FAB_TAP}
          className={cn(
            'relative bb-transition',
            FAB_STACK_INNER_CLASS,
            INVENTORY_QUICK_ACTION_COLORS.fab,
            INVENTORY_QUICK_ACTION_HOVER.fab,
            panelOpen && 'ring-2 ring-amber-600/35 ring-offset-2 ring-offset-background',
            !stacked && cn('fixed z-[201]', FAB_RIGHT_CLASS),
            className,
          )}
        >
          {content}
        </motion.button>
      </HintTooltip>
    );
  }

  return (
    <HintTooltip tip={bellTip} side="bottom">
      <button
        {...sharedProps}
        className={cn(
          'relative flex items-center justify-center rounded-2xl bb-transition h-11 w-11',
          'hover:bg-muted active:bg-muted/80',
          panelOpen && 'bg-muted',
          className
        )}
      >
        {content}
      </button>
    </HintTooltip>
  );
}
