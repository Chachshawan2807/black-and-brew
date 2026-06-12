'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const TOAST_DURATION_MS = 4000;

export function InventoryChangeToast() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const router = useRouter();
  const { toast, dismissToast, openPanel, markRead } = useNotifications();

  useEffect(() => {
    if (!toast?.visible) return;
    const timer = window.setTimeout(() => dismissToast(), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  const handleClick = () => {
    if (!toast?.notification) return;
    markRead(toast.notification.id);
    dismissToast();
    openPanel();
    if (toast.notification.entityId) {
      router.push(`/${locale}/inventory?highlight=${toast.notification.entityId}`);
    } else {
      router.push(`/${locale}/inventory`);
    }
  };

  const isDelete =
    toast?.notification.action === 'DELETE' || toast?.notification.action === 'BULK_DELETE';
  const isTh = locale === 'th';

  return (
    <AnimatePresence>
      {toast?.visible && toast.notification && (
        <motion.button
          type="button"
          initial={{ opacity: 0, x: 24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleClick}
          className={cn(
            'fixed bottom-8 right-8 z-[210] max-w-sm text-left',
            'rounded-3xl border bb-shadow-lg px-5 py-4',
            'bg-card border-border text-foreground',
            'hover:bg-muted/50 bb-transition cursor-pointer'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                isDelete ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              )}
            >
              {isDelete ? (
                <Trash2 size={16} strokeWidth={1.75} />
              ) : (
                <AlertTriangle size={16} strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-normal text-foreground leading-snug">
                {toast.notification.title}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                {toast.notification.summary}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1.5">
                {isTh ? 'แตะเพื่อดูรายละเอียด' : 'Tap for details'}
              </p>
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
