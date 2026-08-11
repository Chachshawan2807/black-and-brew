import { isInstalledPwa } from '@/lib/pwa-app-badge';

/** Chromium `beforeinstallprompt` — not in all TS libs. */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PWA_INSTALL_PROMPT_EVENT = 'beforeinstallprompt';
export const PWA_APP_INSTALLED_EVENT = 'appinstalled';

export type PwaInstallMode = 'native' | 'ios-manual' | 'hidden';

export function isIosPwaInstallable(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function shouldShowPwaInstallOffer(input: {
  installed: boolean;
  hasDeferredPrompt: boolean;
  isIosDevice: boolean;
}): boolean {
  if (input.installed) return false;
  return input.hasDeferredPrompt || input.isIosDevice;
}

export function readPwaInstallVisibility(): {
  installed: boolean;
  isIosDevice: boolean;
} {
  return {
    installed: isInstalledPwa(),
    isIosDevice: isIosPwaInstallable(),
  };
}
