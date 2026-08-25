'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  type BeforeInstallPromptEvent,
  type PwaInstallMode,
  PWA_APP_INSTALLED_EVENT,
  PWA_INSTALL_PROMPT_EVENT,
  readPwaInstallVisibility,
  shouldShowPwaInstallOffer,
} from '@/lib/pwa-install';

const SSR_PWA_VISIBILITY = { installed: false, isIosDevice: false };

function subscribePwaVisibility(onStoreChange: () => void) {
  const onAppInstalled = () => onStoreChange();
  window.addEventListener(PWA_APP_INSTALLED_EVENT, onAppInstalled);
  return () => window.removeEventListener(PWA_APP_INSTALLED_EVENT, onAppInstalled);
}

function getPwaVisibilitySnapshot() {
  return readPwaInstallVisibility();
}

export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);
  const [installedAccepted, setInstalledAccepted] = useState(false);
  const pwaVisibility = useSyncExternalStore(
    subscribePwaVisibility,
    getPwaVisibilitySnapshot,
    () => SSR_PWA_VISIBILITY,
  );
  const isReady = useSyncExternalStore(() => () => {}, () => true, () => false);
  const installed = pwaVisibility.installed || installedAccepted;
  const { isIosDevice } = pwaVisibility;

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setHasDeferredPrompt(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setHasDeferredPrompt(false);
      setInstalledAccepted(true);
    };

    window.addEventListener(PWA_INSTALL_PROMPT_EVENT, onBeforeInstallPrompt);
    window.addEventListener(PWA_APP_INSTALLED_EVENT, onAppInstalled);

    return () => {
      window.removeEventListener(PWA_INSTALL_PROMPT_EVENT, onBeforeInstallPrompt);
      window.removeEventListener(PWA_APP_INSTALLED_EVENT, onAppInstalled);
    };
  }, []);

  const visible = isReady
    && shouldShowPwaInstallOffer({ installed, hasDeferredPrompt, isIosDevice });

  const mode: PwaInstallMode = !visible
    ? 'hidden'
    : hasDeferredPrompt
      ? 'native'
      : 'ios-manual';

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const deferred = deferredPromptRef.current;
    if (!deferred) return 'unavailable';

    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferredPromptRef.current = null;
      setHasDeferredPrompt(false);
      if (outcome === 'accepted') {
        setInstalledAccepted(true);
      }
      return outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  return {
    visible,
    mode,
    promptInstall,
  };
}
