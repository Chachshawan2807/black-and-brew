'use client';

import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Layers, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeOverlay, sheetPanel } from '@/lib/motion-presets';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  formatNotificationTime,
  groupNotificationsByTime,
} from '@/lib/notification-time-groups';
import type { InventoryNotification } from '@/lib/notification-types';
import { ExpandableLines } from '@/components/ui/expandable-lines';
import { HintTooltip } from '@/components/ui/hint-tooltip';

function actionIcon(action: string) {
  switch (action) {
    case 'CREATE':
      return Plus;
    case 'DELETE':
    case 'BULK_DELETE':
      return Trash2;
    case 'BULK_UPDATE':
      return Layers;
    case 'UPDATE':
    default:
      return Pencil;
  }
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
  const Icon = actionIcon(item.action);
  const isHigh = item.priority === 'high';
  const lines = [
    item.title,
    item.summary,
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
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
            isHigh ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-foreground/70'
          )}
        >
          <Icon size={14} strokeWidth={1.75} />
        </div>
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

  const {
    notifications,
    panelOpen,
    unreadCount,
    closePanel,
    markAllRead,
    markRead,
    clearAll,
  } = useNotifications();

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
        <>
          <motion.div
            initial={fadeOverlay.initial}
            animate={fadeOverlay.animate}
            exit={fadeOverlay.exit}
            transition={fadeOverlay.transition}
            className="fixed inset-0 z-[214] bg-black/40 backdrop-blur-sm"
            onClick={closePanel}
            aria-hidden
          />
          <motion.aside
            initial={sheetPanel.initial}
            animate={sheetPanel.animate}
            exit={sheetPanel.exit}
            transition={sheetPanel.transition}
            className={cn(
              'fixed top-0 right-0 z-[215] h-[100dvh]',
              'bg-background border-l border-border bb-shadow-lg',
              'flex flex-col',
              'w-full max-w-md',
              // Leave a left tap strip on non-desktop so the backdrop can dismiss the panel.
              'max-md:w-[85vw] max-md:max-w-none',
            )}
            role="dialog"
            aria-label={isTh ? 'ศูนย์แจ้งเตือนคลังสินค้า' : 'Inventory notifications'}
          >
            <header className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <Package size={16} strokeWidth={1.75} className="text-foreground/70" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-normal text-foreground leading-snug">
                    {isTh ? 'แจ้งเตือนคลังสินค้า' : 'Inventory alerts'}
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    {unreadCount > 0
                      ? isTh
                        ? `${unreadCount} รายการยังไม่ได้อ่าน`
                        : `${unreadCount} unread`
                      : isTh
                        ? 'การเปลี่ยนแปลงล่าสุด'
                        : 'Recent changes · live updates'}
                  </p>
                </div>
              </div>
              <HintTooltip tip={isTh ? 'ปิดศูนย์แจ้งเตือน' : 'Close notifications'}>
                <button
                  type="button"
                  onClick={closePanel}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted bb-transition"
                  aria-label={isTh ? 'ปิด' : 'Close'}
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </HintTooltip>
            </header>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[12px] text-muted-foreground hover:text-foreground bb-transition"
                >
                  {isTh ? 'อ่านทั้งหมด' : 'Mark all read'}
                </button>
                <span className="text-muted-foreground/50">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[12px] text-muted-foreground hover:text-foreground bb-transition"
                >
                  {isTh ? 'ล้างประวัติ' : 'Clear history'}
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto bb-smooth-scroll px-4 py-4 space-y-5">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
                    <Package size={20} strokeWidth={1.75} className="text-muted-foreground" />
                  </div>
                  <p className="text-[14px] text-foreground">
                    {isTh ? 'ยังไม่มีการแจ้งเตือน' : 'No notifications yet'}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                    {isTh
                      ? 'เมื่อมีการเปลี่ยนแปลงคลังสินค้า จะแสดงที่นี่'
                      : 'Inventory changes from your team will appear here'}
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
        </>
      )}
    </AnimatePresence>
  );
}
