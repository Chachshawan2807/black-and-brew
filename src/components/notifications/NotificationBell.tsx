'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/components/notifications/NotificationProvider';

type NotificationBellProps = {
  compact?: boolean;
  className?: string;
};

export function NotificationBell({ compact = false, className }: NotificationBellProps) {
  const { unreadCount, panelOpen, setPanelOpen } = useNotifications();

  return (
    <button
      type="button"
      onClick={() => setPanelOpen(!panelOpen)}
      className={cn(
        'relative flex items-center justify-center rounded-2xl bb-transition',
        'hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15',
        compact ? 'h-10 w-10' : 'h-11 w-11',
        panelOpen && 'bg-black/5 dark:bg-white/10',
        className
      )}
      aria-label={unreadCount > 0 ? `การแจ้งเตือน ${unreadCount} รายการใหม่` : 'การแจ้งเตือน'}
    >
      <Bell className="h-[18px] w-[18px] text-foreground/80" strokeWidth={1.75} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
