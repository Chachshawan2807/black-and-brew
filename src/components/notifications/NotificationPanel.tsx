'use client';

/** IRON RULE: in-app notification rows are view-only no links or navigation. See AGENTS.md § notification-panel-view-only-standard */

import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell, CheckCheck, Trash2 } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { notificationOverlay, notificationPanel, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { useMobileBackLayer } from '@/hooks/use-mobile-back-layer';
import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  formatNotificationTime,
  groupNotificationsByTime,
} from '@/lib/notification-time-groups';
import { countUnread } from '@/lib/notification-storage';
import type { InventoryNotification } from '@/lib/notification-types';
import { ExpandableLines } from '@/components/ui/expandable-lines';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { NotificationItemIcon } from '@/components/notifications/NotificationItemIcon';
import { INVENTORY_QUICK_ACTION_COLORS } from '@/lib/shift-colors';
import { isScheduleNotification, isSecurityNotification, isProactiveInsightNotification, isBeanOrderCreatedNotification } from '@/lib/notification-display-icon';

function getNotificationDetailLines(item: InventoryNotification): string[] {
  if (isBeanOrderCreatedNotification(item)) {
    const lines: string[] = [];
    if (item.summary.trim()) lines.push(item.summary.trim());
    if (item.fieldSummary.trim()) lines.push(item.fieldSummary.trim());
    return lines;
  }
  if (
    (isScheduleNotification(item) ||
      isSecurityNotification(item) ||
      isProactiveInsightNotification(item)) &&
    item.fieldSummary.trim()
  ) {
    return item.fieldSummary.split('\n').filter(Boolean);
  }
  return item.summary ? [item.summary] : [];
}

function NotificationRow({
  item,
  locale,
  isTh,
}: {
  item: InventoryNotification;
  locale: string;
  isTh: boolean;
}) {
  const isSchedule = isScheduleNotification(item);
  const detailLines = getNotificationDetailLines(item);
  const metaLine = formatNotificationTime(item.occurredAt, locale);

  return (
    <div
      className={cn(
        'relative w-full text-left rounded-2xl border px-3.5 py-3',
        'border-border bg-card bb-transition',
        !item.read && 'border-l-[3px] border-l-amber-500 pl-[calc(0.875rem-1px)] bg-amber-500/[0.04]',
      )}
    >
      <div className="flex items-start gap-3">
        <NotificationItemIcon item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[13px] leading-snug',
                  item.read ? 'text-foreground/90' : 'text-foreground font-medium',
                )}
              >
                {item.title}
              </p>
              {detailLines.length > 0 && (
                <ExpandableLines
                  lines={detailLines}
                  isTh={isTh}
                  maxLines={isSchedule ? detailLines.length : undefined}
                  lineClassName="text-[12px] text-muted-foreground leading-normal text-left"
                  className="mt-0.5 text-left"
                />
              )}
              <p className="text-[11px] text-muted-foreground/90 leading-normal mt-1 tabular-nums">
                {metaLine}
              </p>
            </div>
            {!item.read && (
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/25"
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationPanel() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const isTh = locale === 'th';
  const reduced = usePrefersReducedMotion();
  const overlayMotion = withReducedMotion(notificationOverlay, reduced);
  const panelMotion = withReducedMotion(notificationPanel, reduced);

  const {
    notifications,
    panelOpen,
    unreadCount,
    closePanel,
    markAllRead,
    clearAll,
  } = useNotifications();

  const viewportInsets = useVisualViewportInsets(panelOpen);

  useMobileBackLayer('notification-panel', panelOpen, closePanel);
  const backdropStyle = getModalBackdropKeyboardAwareStyle({ insets: viewportInsets });
  const panelStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });

  const groups = groupNotificationsByTime(notifications, locale);
  const visibleUnread = countUnread(notifications);
  const hasOlderUnread = unreadCount > visibleUnread;

  const unreadSummary =
    unreadCount > 0
      ? isTh
        ? hasOlderUnread
          ? `${unreadCount} รายการยังไม่ได้อ่าน · แสดง ${notifications.length} รายการล่าสุด`
          : `${unreadCount} รายการยังไม่ได้อ่าน`
        : hasOlderUnread
          ? `${unreadCount} unread · showing latest ${notifications.length}`
          : `${unreadCount} unread`
      : isTh
        ? 'รายการล่าสุด'
        : 'Recent notifications · live updates';

  return (
    <AnimatePresence>
      {panelOpen && (
        <motion.div
          key="notification-overlay"
          className="fixed inset-0 z-[204]"
          initial={overlayMotion.initial}
          animate={overlayMotion.animate}
          exit={overlayMotion.exit}
          transition={overlayMotion.transition}
        >
          <motion.div
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            onClick={closePanel}
            aria-hidden
          />
          <div
            className="fixed inset-0 z-[205] flex items-center justify-center pointer-events-none p-4 max-md:p-3"
            style={backdropStyle}
          >
            <motion.aside
              initial={panelMotion.initial}
              animate={panelMotion.animate}
              exit={panelMotion.exit}
              transition={panelMotion.transition}
              style={panelStyle}
              className={cn(
                'pointer-events-auto box-border flex flex-col overflow-hidden w-full max-w-md',
                'bg-background border border-border rounded-3xl bb-shadow-lg',
                'max-h-[min(75vh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-8rem))]',
                'max-md:max-h-[min(80dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-6rem))]',
              )}
              role="dialog"
              aria-modal="true"
              aria-label={isTh ? 'การแจ้งเตือน' : 'Notifications'}
            >
              <header className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border shrink-0 bg-card/60 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      INVENTORY_QUICK_ACTION_COLORS.fab,
                    )}
                    aria-hidden
                  >
                    <Bell size={17} strokeWidth={1.75} className="text-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="text-[15px] font-normal text-foreground leading-snug truncate">
                        {isTh ? 'การแจ้งเตือน' : 'Notifications'}
                      </h2>
                      {unreadCount > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-amber-700 dark:text-amber-300">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal truncate">
                      {unreadSummary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 rounded-2xl bg-muted/40 p-0.5">
                  {notifications.length > 0 && (
                    <>
                      <HintTooltip tip={isTh ? 'อ่านทั้งหมด' : 'Mark all read'}>
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-background/80 bb-transition"
                          aria-label={isTh ? 'อ่านทั้งหมด' : 'Mark all read'}
                        >
                          <CheckCheck size={17} strokeWidth={1.75} />
                        </button>
                      </HintTooltip>
                      <HintTooltip tip={isTh ? 'ล้างประวัติ' : 'Clear history'}>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-background/80 bb-transition"
                          aria-label={isTh ? 'ล้างประวัติ' : 'Clear history'}
                        >
                          <Trash2 size={17} strokeWidth={1.75} />
                        </button>
                      </HintTooltip>
                    </>
                  )}
                  <HintTooltip tip={isTh ? 'ปิดการแจ้งเตือน' : 'Close notifications'}>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-background/80 bb-transition"
                      aria-label={isTh ? 'ปิด' : 'Close'}
                    >
                      <X size={18} strokeWidth={1.75} />
                    </button>
                  </HintTooltip>
                </div>
              </header>

              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto bb-smooth-scroll px-3 py-3 space-y-4">
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-2xl mb-4',
                        INVENTORY_QUICK_ACTION_COLORS.fab,
                      )}
                      aria-hidden
                    >
                      <Bell size={24} strokeWidth={1.5} className="text-black/70" />
                    </div>
                    <p className="text-[14px] text-foreground">
                      {isTh ? 'ยังไม่มีการแจ้งเตือน' : 'No notifications yet'}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[260px] leading-relaxed">
                      {isTh
                        ? 'รายการใหม่จากทีมจะแสดงที่นี่แบบเรียลไทม์'
                        : 'New team updates will appear here in real time'}
                    </p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <section key={group.key}>
                      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80 mb-2 px-1.5">
                        {group.label}
                      </h3>
                      <div className="space-y-1.5">
                        {group.items.map((item) => (
                          <NotificationRow
                            key={item.id}
                            item={item}
                            locale={locale}
                            isTh={isTh}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </motion.aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
