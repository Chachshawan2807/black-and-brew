'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { CloudOff, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { requestOfflineSyncRetry, useOfflineStatus } from '@/hooks/use-offline-status';
import { resolveOfflineBannerView } from '@/lib/offline-status';
import { cn } from '@/lib/utils';

const VARIANT_STYLES = {
  offline: 'bg-amber-100/95 text-amber-950 border-amber-200/80 dark:bg-amber-950/90 dark:text-amber-50 dark:border-amber-800/60',
  syncing: 'bg-sky-100/95 text-sky-950 border-sky-200/80 dark:bg-sky-950/90 dark:text-sky-50 dark:border-sky-800/60',
  pending: 'bg-amber-100/95 text-amber-950 border-amber-200/80 dark:bg-amber-950/90 dark:text-amber-50 dark:border-amber-800/60',
  error: 'bg-red-100/95 text-red-950 border-red-200/80 dark:bg-red-950/90 dark:text-red-50 dark:border-red-800/60',
} as const;

export function OfflineStatusBanner() {
  const params = useParams();
  const locale = (params?.locale as string) === 'en' ? 'en' : 'th';
  const status = useOfflineStatus();

  const view = useMemo(
    () => resolveOfflineBannerView(status, locale),
    [locale, status],
  );

  if (!view.visible) return null;

  const Icon =
    view.variant === 'offline'
      ? WifiOff
      : view.variant === 'syncing'
        ? Loader2
        : view.variant === 'error'
          ? CloudOff
          : RefreshCw;

  const showRetry =
    Boolean(view.actionLabel) &&
    (view.variant === 'pending' || view.variant === 'error') &&
    !status.isSyncing;

  return (
    <div
      className={cn(
        'sticky top-0 z-40 border-b px-3 py-2',
        VARIANT_STYLES[view.variant],
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2.5">
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            view.variant === 'syncing' && 'animate-spin',
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-[13px] leading-snug">{view.message}</p>
        {showRetry ? (
          <button
            type="button"
            onClick={() => requestOfflineSyncRetry()}
            className="shrink-0 rounded-lg border border-current/20 bg-background/70 px-2.5 py-1 text-[12px] font-medium text-foreground touch-manipulation"
          >
            {view.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
