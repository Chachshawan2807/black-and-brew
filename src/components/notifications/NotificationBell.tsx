'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { FAB_HOVER, FAB_TAP } from '@/lib/motion-presets';
import { cn } from '@/lib/utils';
import { formatInAppBadgeLabel, getInAppBadgeClassName } from '@/lib/notification-badge';
import { FAB_BASE_CLASS, FAB_STACK_INNER_CLASS } from '@/lib/floating-action-layout';
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
  const { unreadCount, panelOpen } = useNotificationState();
  const { setPanelOpen } = useNotificationActions();
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
    onClick: () => setPanelOpen(!panelOpen),
    'aria-label':
      unreadCount > 0
        ? `การแจ้งเตือน ${unreadCount} รายการใหม่`
        : 'การแจ้งเตือน',
  };

  const content = (
    <>
      <Bell
        className={cn(isFab ? 'h-[22px] w-[22px]' : 'h-[18px] w-[18px] text-foreground/80')}
        strokeWidth={1.75}
        aria-hidden={isFab}
      />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className={cn(
            'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full font-semibold tabular-nums',
            'bg-red-500 text-white border border-red-600/80 bb-shadow-sm',
            getInAppBadgeClassName(unreadCount),
            pulse && 'animate-pulse ring-2 ring-red-400/60',
          )}
        >
          {formatInAppBadgeLabel(unreadCount)}
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {unreadCount > 0 ? `${unreadCount} unread inventory notifications` : ''}
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
            stacked ? FAB_STACK_INNER_CLASS : cn(FAB_BASE_CLASS, 'z-[201]'),
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
          'hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15',
          panelOpen && 'bg-black/5 dark:bg-white/10',
          className
        )}
      >
        {content}
      </button>
    </HintTooltip>
  );
}
