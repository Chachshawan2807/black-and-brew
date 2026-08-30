import { PWA_MANIFEST_BACKGROUND } from '@/lib/pwa-assets';

/** Applied to <html> when the app runs as an installed home-screen PWA. */
export const PWA_STANDALONE_CLASS = 'bb-pwa-standalone';

/** Applied with standalone class on iOS/iPadOS WebKit home-screen PWAs. */
export const PWA_IOS_CLASS = 'bb-pwa-ios';

/** Applied on Android phones/tablets for platform-specific UI tuning (schedule compact, etc.). */
export const PWA_ANDROID_CLASS = 'bb-pwa-android';

export const PWA_THEME_STORAGE_KEY = 'bb-theme';

export const PWA_THEME_COLORS = {
  light: PWA_MANIFEST_BACKGROUND,
  dark: '#161614',
} as const;

export function isIosWebKit(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function isAndroidWebKit(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  return /Android/i.test(userAgent);
}

export function resolvePwaThemeColor(isDark: boolean): string {
  return isDark ? PWA_THEME_COLORS.dark : PWA_THEME_COLORS.light;
}

export function resolveThemePreferenceFromStorage(
  stored: string | null,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

/**
 * Inline bootstrap runs synchronously before first paint.
 * Sets standalone shell class + theme-color to match bb-theme (no flash on notch devices).
 */
export const PWA_SHELL_BOOTSTRAP_SCRIPT = `(function(){try{var ua=navigator.userAgent;var ios=/iPhone|iPad|iPod/i.test(ua);var android=/Android/i.test(ua);var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;if(s){document.documentElement.classList.add('${PWA_STANDALONE_CLASS}');if(ios)document.documentElement.classList.add('${PWA_IOS_CLASS}');}if(android)document.documentElement.classList.add('${PWA_ANDROID_CLASS}');var t=localStorage.getItem('${PWA_THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=d?'${PWA_THEME_COLORS.dark}':'${PWA_THEME_COLORS.light}';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c);else{m=document.createElement('meta');m.name='theme-color';m.content=c;document.head.appendChild(m);}}catch(e){}})();`;
