'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { isInstalledPwa } from '@/lib/pwa-app-badge';
import {
  PWA_ANDROID_CLASS,
  PWA_IOS_CLASS,
  PWA_STANDALONE_CLASS,
  isAndroidWebKit,
  isIosWebKit,
  resolvePwaThemeColor,
} from '@/lib/pwa-standalone';

/** Keeps status-bar theme-color and standalone shell class in sync after hydration. */
export function PwaShellSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isInstalledPwa()) return;
    document.documentElement.classList.add(PWA_STANDALONE_CLASS);
    if (isIosWebKit()) {
      document.documentElement.classList.add(PWA_IOS_CLASS);
    }
  }, []);

  useEffect(() => {
    if (isAndroidWebKit()) {
      document.documentElement.classList.add(PWA_ANDROID_CLASS);
    }
  }, []);

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvePwaThemeColor(resolvedTheme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [resolvedTheme]);

  return null;
}
