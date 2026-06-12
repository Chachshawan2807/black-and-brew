'use client';

import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FAB_BOTTOM_NOTIFICATION_CLASS, FAB_RIGHT_CLASS, FAB_SIZE_CLASS } from '@/lib/floating-action-layout';
import { useNotificationState, useNotificationActions } from '@/components/notifications/NotificationProvider';

type NotificationBellProps = {
  variant?: 'sidebar' | 'fab';
  className?: string;
};

export function NotificationBell({ variant = 'sidebar', className }: NotificationBellProps) {
  const { unreadCount, panelOpen } = useNotificationState();
  const { setPanelOpen } = useNotificationActions();
  const isFab = variant === 'fab';

  const sharedProps = {
    type: 'button' as const,
    onClick: () => setPanelOpen(!panelOpen),
    'aria-label': unreadCount > 0 ? `การแจ้งเตือน ${unreadCount} รายการใหม่` : 'การแจ้งเตือน',
  };

  const content = (
    <>
      <Bell
        className={cn('h-[18px] w-[18px]', isFab ? 'text-white' : 'text-foreground/80')}
        strokeWidth={1.75}
      />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-medium',
            isFab ? 'bg-white text-black border border-black/10' : 'bg-amber-500 text-white'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </>
  );

  if (isFab) {
    return (
      <motion.button
        {...sharedProps}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className={cn(
          'relative flex items-center justify-center bb-transition',
          FAB_SIZE_CLASS,
          FAB_RIGHT_CLASS,
          FAB_BOTTOM_NOTIFICATION_CLASS,
          'fixed z-[201] rounded-full bg-[#000000] text-white shadow-lg',
          panelOpen && 'ring-2 ring-white/30',
          className
        )}
      >
        {content}
      </motion.button>
    );
  }

  return (
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
  );
}
