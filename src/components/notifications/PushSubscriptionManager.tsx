'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CloseIcon } from '@/components/ui/close-icon';
import { cn } from '@/lib/utils';
import { BB_BTN_CLOSE } from '@/lib/ui-outlined-tokens';
import { Bell, X } from '@/lib/icons';
import { loadNotificationPreferences } from '@/lib/notification-preferences';
import { getNotificationPermissionState } from '@/lib/pwa-notification-bridge';
import {
  ensurePushSubscriptionFromUserGesture,
  formatPushRegistrationError,
  getLastPushRegistrationError,
  hasServerPushRegistration,
  refreshLocalPushSubscriptionState,
  requiresUserGestureForPushSubscribe,
  schedulePushSubscriptionMaintenance,
  wantsPushRegistration,
} from '@/lib/push-subscription-client';

const IOS_PUSH_BANNER_DISMISSED_KEY = 'bb-ios-push-banner-dismissed-v1';

/** Belt-and-suspenders push refresh after PIN auth (main resume logic lives in PwaRegister). */
export function PushSubscriptionManager() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const isTh = locale === 'th';
  const isIos = requiresUserGestureForPushSubscribe();
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const refreshBannerState = useCallback(async () => {
    if (!isIos) {
      setShowIosBanner(false);
      return;
    }

    const prefs = loadNotificationPreferences();
    if (!wantsPushRegistration(prefs)) {
      setShowIosBanner(false);
      return;
    }

    if (typeof window !== 'undefined' && localStorage.getItem(IOS_PUSH_BANNER_DISMISSED_KEY) === '1') {
      setShowIosBanner(false);
      return;
    }

    await refreshLocalPushSubscriptionState();
    const permission = getNotificationPermissionState();
    setShowIosBanner(
      permission !== 'denied' && !hasServerPushRegistration(),
    );
  }, [isIos]);

  useEffect(() => {
    const schedule = () => {
      schedulePushSubscriptionMaintenance(locale);
      void refreshBannerState();
    };

    schedule();
    window.addEventListener('bb-pin-authenticated', schedule);
    window.addEventListener('bb-notification-prefs-changed', schedule);

    return () => {
      window.removeEventListener('bb-pin-authenticated', schedule);
      window.removeEventListener('bb-notification-prefs-changed', schedule);
    };
  }, [locale, refreshBannerState]);

  const registerFromBanner = async () => {
    setRegistering(true);
    setBannerError(null);
    try {
      const ok = await ensurePushSubscriptionFromUserGesture(locale);
      await refreshBannerState();
      if (!ok) {
        const err = getLastPushRegistrationError();
        setBannerError(
          err ? formatPushRegistrationError(err, isTh) : formatPushRegistrationError('ensure_failed', isTh),
        );
      }
    } finally {
      setRegistering(false);
    }
  };

  const dismissBanner = () => {
    try {
      localStorage.setItem(IOS_PUSH_BANNER_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
    setShowIosBanner(false);
  };

  return showIosBanner ? (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[70] px-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-border bg-background/95 bb-shadow-lg p-3">
        <div className="flex items-start gap-3">
          <Bell size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-foreground leading-snug">
              {isTh
                ? 'iPhone ต้องลงทะเบียนการแจ้งเตือนกับเซิร์ฟเวอร์ก่อน กดปุ่มด้านล่าง'
                : 'iPhone must register push with the server tap the button below'}
            </p>
            {bannerError ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{bannerError}</p>
            ) : null}
            <button
              type="button"
              disabled={registering}
              onClick={() => void registerFromBanner()}
              className={cn(BB_BTN_OUTLINE_PRIMARY, 'mt-2 text-[12px] px-3 py-1.5 disabled:opacity-60')}
            >
              {registering ? <LoadingIcon size={14} className="animate-spin" /> : null}
              {isTh ? 'ลงทะเบียนการแจ้งเตือน' : 'Register notifications'}
            </button>
          </div>
          <button
            type="button"
            aria-label={isTh ? 'ปิด' : 'Dismiss'}
            onClick={dismissBanner}
            className={cn(BB_BTN_CLOSE, 'shrink-0 h-8 w-8 min-h-0 min-w-0')}
          >
            <CloseIcon size="sm" />
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
