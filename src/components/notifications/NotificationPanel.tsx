'use client';

import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CalendarRange, CheckCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeOverlay, notificationOverlay, notificationPanel, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  formatNotificationTime,
  groupNotificationsByTime,
} from '@/lib/notification-time-groups';
import type { InventoryNotification } from '@/lib/notification-types';
import { ExpandableLines } from '@/components/ui/expandable-lines';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { NotificationItemIcon } from '@/components/notifications/NotificationItemIcon';
import { isScheduleNotification } from '@/lib/notification-display-icon';
import { PWA_BRAND_ICON } from '@/lib/pwa-assets';
import Image from 'next/image';

function getNotificationDetailLines(item: InventoryNotification): string[] {
  if (isScheduleNotification(item) && item.fieldSummary.trim()) {
    return item.fieldSummary.split('\n').filter(Boolean);
  }
  return item.summary ? [item.summary] : [];
}

function NotificationRow({
  item,
  locale,
  onNavigate,
  isTh,
}: {
  item: InventoryNotification;
  locale: string;
  isTh: boolean;
  onNavigate: (item: InventoryNotification) => void;
}) {
  const lines = [
    item.title,
    ...getNotificationDetailLines(item),
    `${item.actorLabel} · ${formatNotificationTime(item.occurredAt, locale)}`,
  ].filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(item);
        }
      }}
      className={cn(
        'w-full text-left rounded-2xl border px-3.5 py-3 bb-transition cursor-pointer',
        'border-border bg-card hover:bg-muted/40',
        !item.read && 'border-amber-500/20 bg-amber-500/[0.03]'
      )}
    >
      <div className="flex items-start gap-3">
        <NotificationItemIcon item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-foreground leading-snug">{item.title}</p>
              <ExpandableLines
                lines={lines.slice(1)}
                isTh={isTh}
                lineClassName="text-[12px] text-muted-foreground leading-normal"
                className="mt-0.5"
              />
            </div>
            {!item.read && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
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
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const overlayMotion = withReducedMotion(notificationOverlay, reduced);
  const panelMotion = withReducedMotion(notificationPanel, reduced);

  const {
    notifications,
    panelOpen,
    unreadCount,
    closePanel,
    markAllRead,
    markRead,
    clearAll,
  } = useNotifications();

  const viewportInsets = useVisualViewportInsets(panelOpen);
  const backdropStyle = getModalBackdropKeyboardAwareStyle({ insets: viewportInsets });
  const panelStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });

  const groups = groupNotificationsByTime(notifications, locale);

  const handleNavigate = (item: InventoryNotification) => {
    markRead(item.id);
    closePanel();
    const url = typeof item.metadata?.url === 'string' ? item.metadata.url : null;
    if (url) {
      router.push(url);
      return;
    }
    if (item.entityId) {
      router.push(`/${locale}/inventory?highlight=${item.entityId}`);
    } else {
      router.push(`/${locale}/inventory`);
    }
  };

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
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
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
                'max-h-[min(75vh,calc(100dvh-8rem))]',
              )}
              role="dialog"
              aria-modal="true"
              aria-label={isTh ? 'การแจ้งเตือน' : 'Notifications'}
            >
              <header className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-transparent">
                    <Image
                      src={PWA_BRAND_ICON}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-normal text-foreground leading-snug">
                      {isTh ? 'การแจ้งเตือน' : 'Notifications'}
                    </h2>
                    <p className="text-[12px] text-muted-foreground">
                      {unreadCount > 0
                        ? isTh
                          ? `${unreadCount} รายการยังไม่ได้อ่าน`
                          : `${unreadCount} unread`
                        : isTh
                          ? 'รายการล่าสุด'
                          : 'Recent notifications · live updates'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {notifications.length > 0 && (
                    <>
                      <HintTooltip tip={isTh ? 'อ่านทั้งหมด' : 'Mark all read'}>
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted bb-transition"
                          aria-label={isTh ? 'อ่านทั้งหมด' : 'Mark all read'}
                        >
                          <CheckCheck size={17} strokeWidth={1.75} />
                        </button>
                      </HintTooltip>
                      <HintTooltip tip={isTh ? 'ล้างประวัติ' : 'Clear history'}>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted bb-transition"
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
                      className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted bb-transition"
                      aria-label={isTh ? 'ปิด' : 'Close'}
                    >
                      <X size={18} strokeWidth={1.75} />
                    </button>
                  </HintTooltip>
                </div>
              </header>

              <div className="flex-1 min-h-0 overflow-y-auto bb-smooth-scroll px-4 py-4 space-y-5">
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent mb-3">
                      <CalendarRange size={22} strokeWidth={1.75} className="text-muted-foreground" />
                    </div>
                    <p className="text-[14px] text-foreground">
                      {isTh ? 'ยังไม่มีการแจ้งเตือน' : 'No notifications yet'}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                      {isTh
                        ? 'เมื่อมีรายการแจ้งเตือนใหม่ จะแสดงที่นี่'
                        : 'New notifications from your team will appear here'}
                    </p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <section key={group.key}>
                      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
                        {group.label}
                      </h3>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <NotificationRow
                            key={item.id}
                            item={item}
                            locale={locale}
                            isTh={isTh}
                            onNavigate={handleNavigate}
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
