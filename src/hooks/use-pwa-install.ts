'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BeforeInstallPromptEvent,
  PWA_APP_INSTALLED_EVENT,
  PWA_INSTALL_PROMPT_EVENT,
  readPwaInstallVisibility,
  shouldShowPwaInstallOffer,
} from '@/lib/pwa-install';

export type PwaInstallMode = 'native' | 'ios-manual' | 'hidden';

export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const { installed: alreadyInstalled, isIosDevice: ios } = readPwaInstallVisibility();
    setInstalled(alreadyInstalled);
    setIsIosDevice(ios);
    setIsReady(true);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setHasDeferredPrompt(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setHasDeferredPrompt(false);
      setInstalled(true);
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
        setInstalled(true);
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
