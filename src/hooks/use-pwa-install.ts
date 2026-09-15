'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  type BeforeInstallPromptEvent,
  type PwaInstallMode,
  PWA_APP_INSTALLED_EVENT,
  PWA_INSTALL_PROMPT_EVENT,
  isIosPwaInstallable,
  shouldShowPwaInstallOffer,
} from '@/lib/pwa-install';
import { isInstalledPwa } from '@/lib/pwa-app-badge';

const SSR_PWA_VISIBILITY = { installed: false, isIosDevice: false };

let cachedPwaVisibility = SSR_PWA_VISIBILITY;

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalInstalledAccepted = false;
let installStoreListenersAttached = false;
const installStoreListeners = new Set<() => void>();
let cachedInstallStore = { hasDeferredPrompt: false, installedAccepted: false };

function emitInstallStoreChange() {
  installStoreListeners.forEach((listener) => listener());
}

function attachInstallStoreListeners() {
  if (installStoreListenersAttached || typeof window === 'undefined') return;
  installStoreListenersAttached = true;

  window.addEventListener(PWA_INSTALL_PROMPT_EVENT, (event) => {
    event.preventDefault();
    globalDeferredPrompt = event as BeforeInstallPromptEvent;
    emitInstallStoreChange();
  });

  window.addEventListener(PWA_APP_INSTALLED_EVENT, () => {
    globalDeferredPrompt = null;
    globalInstalledAccepted = true;
    emitInstallStoreChange();
  });
}

function subscribeInstallStore(onStoreChange: () => void) {
  attachInstallStoreListeners();
  installStoreListeners.add(onStoreChange);
  return () => {
    installStoreListeners.delete(onStoreChange);
  };
}

function getInstallStoreSnapshot() {
  attachInstallStoreListeners();
  const hasDeferredPrompt = globalDeferredPrompt != null;
  if (
    cachedInstallStore.hasDeferredPrompt !== hasDeferredPrompt ||
    cachedInstallStore.installedAccepted !== globalInstalledAccepted
  ) {
    cachedInstallStore = {
      hasDeferredPrompt,
      installedAccepted: globalInstalledAccepted,
    };
  }
  return cachedInstallStore;
}

function subscribePwaVisibility(onStoreChange: () => void) {
  const onAppInstalled = () => onStoreChange();
  window.addEventListener(PWA_APP_INSTALLED_EVENT, onAppInstalled);
  return () => window.removeEventListener(PWA_APP_INSTALLED_EVENT, onAppInstalled);
}

function getPwaVisibilitySnapshot() {
  const installed = isInstalledPwa();
  const isIosDevice = isIosPwaInstallable();
  if (
    cachedPwaVisibility.installed !== installed ||
    cachedPwaVisibility.isIosDevice !== isIosDevice
  ) {
    cachedPwaVisibility = { installed, isIosDevice };
  }
  return cachedPwaVisibility;
}

export function usePwaInstall() {
  const installStore = useSyncExternalStore(
    subscribeInstallStore,
    getInstallStoreSnapshot,
    () => ({ hasDeferredPrompt: false, installedAccepted: false }),
  );
  const pwaVisibility = useSyncExternalStore(
    subscribePwaVisibility,
    getPwaVisibilitySnapshot,
    () => SSR_PWA_VISIBILITY,
  );
  const isReady = useSyncExternalStore(() => () => {}, () => true, () => false);
  const installed = pwaVisibility.installed || installStore.installedAccepted;
  const { isIosDevice } = pwaVisibility;
  const { hasDeferredPrompt } = installStore;

  const visible = isReady
    && shouldShowPwaInstallOffer({ installed, hasDeferredPrompt, isIosDevice });

  const mode: PwaInstallMode = !visible
    ? 'hidden'
    : hasDeferredPrompt
      ? 'native'
      : 'ios-manual';

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const deferred = globalDeferredPrompt;
    if (!deferred) return 'unavailable';

    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      globalDeferredPrompt = null;
      if (outcome === 'accepted') {
        globalInstalledAccepted = true;
      }
      emitInstallStoreChange();
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
