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
 * Locks pinch-zoom on installed iOS PWAs only (browser tabs keep default zoom).
 * Mirrors Android standalone behavior and prevents visualViewport layout drift.
 */
export function mergeViewportContentForIosStandalone(content: string): string {
  const trimmed = content.trim().replace(/,+\s*$/, '');
  if (!/maximum-scale/i.test(trimmed)) {
    return `${trimmed}, maximum-scale=1, user-scalable=no`;
  }
  return trimmed
    .replace(/maximum-scale\s*=\s*[^,]+/gi, 'maximum-scale=1')
    .replace(/user-scalable\s*=\s*[^,]+/gi, 'user-scalable=no');
}

/** Minified block injected into the bootstrap IIFE (must stay in sync with mergeViewportContentForIosStandalone). */
const PWA_IOS_STANDALONE_VIEWPORT_LOCK_SCRIPT = `if(ios&&s){var vp=document.querySelector('meta[name="viewport"]');if(vp){var vc=(vp.getAttribute("content")||"").trim();if(!/maximum-scale/i.test(vc)){vc=vc+(vc?",":"")+" maximum-scale=1, user-scalable=no";}else{vc=vc.replace(/maximum-scale\\s*=\\s*[^,]+/gi,"maximum-scale=1").replace(/user-scalable\\s*=\\s*[^,]+/gi,"user-scalable=no");}vp.setAttribute("content",vc);}document.addEventListener("gesturestart",function(e){e.preventDefault();},{passive:false});}`;

/**
 * Inline bootstrap runs synchronously before first paint.
 * Sets standalone shell class + theme-color to match bb-theme (no flash on notch devices).
 */
export const PWA_SHELL_BOOTSTRAP_SCRIPT = `(function(){try{var ua=navigator.userAgent;var ios=/iPhone|iPad|iPod/i.test(ua);var android=/Android/i.test(ua);var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;if(s){document.documentElement.classList.add('${PWA_STANDALONE_CLASS}');if(ios){document.documentElement.classList.add('${PWA_IOS_CLASS}');${PWA_IOS_STANDALONE_VIEWPORT_LOCK_SCRIPT}}}if(android)document.documentElement.classList.add('${PWA_ANDROID_CLASS}');var t=localStorage.getItem('${PWA_THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=d?'${PWA_THEME_COLORS.dark}':'${PWA_THEME_COLORS.light}';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c);else{m=document.createElement('meta');m.name='theme-color';m.content=c;document.head.appendChild(m);}}catch(e){}})();`;
