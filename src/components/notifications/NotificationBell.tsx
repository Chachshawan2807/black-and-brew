'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FAB_RIGHT_CLASS, FAB_SIZE_CLASS, FAB_NOTIFICATION_INNER_CLASS } from '@/lib/floating-action-layout';
import { PWA_BRAND_ICON } from '@/lib/pwa-assets';
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
      {isFab ? (
        <Image
          src={PWA_BRAND_ICON}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] object-contain"
          aria-hidden
        />
      ) : (
        <Bell className="h-[18px] w-[18px] text-foreground/80" strokeWidth={1.75} />
      )}
      {unreadCount > 0 && (
        <span
          aria-hidden
          className={cn(
            'absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
            'bg-red-500 text-white border border-red-600/80 bb-shadow-sm',
            pulse && 'animate-pulse ring-2 ring-red-400/60',
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
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
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            stacked
              ? cn('relative bb-transition', FAB_NOTIFICATION_INNER_CLASS, className)
              : cn(
                  'relative flex items-center justify-center bb-transition',
                  FAB_SIZE_CLASS,
                  FAB_RIGHT_CLASS,
                  'fixed z-[201] rounded-full bg-transparent shadow-none',
                  className,
                ),
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
