import { PWA_MANIFEST_BACKGROUND } from '@/lib/pwa-assets';

/** Applied to <html> when the app runs as an installed home-screen PWA. */
export const PWA_STANDALONE_CLASS = 'bb-pwa-standalone';

export const PWA_THEME_STORAGE_KEY = 'bb-theme';

export const PWA_THEME_COLORS = {
  light: PWA_MANIFEST_BACKGROUND,
  dark: '#161614',
} as const;

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
 * Inline bootstrap — runs synchronously before first paint.
 * Sets standalone shell class + theme-color to match bb-theme (no flash on notch devices).
 */
export const PWA_SHELL_BOOTSTRAP_SCRIPT = `(function(){try{var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;if(s)document.documentElement.classList.add('${PWA_STANDALONE_CLASS}');var t=localStorage.getItem('${PWA_THEME_STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=d?'${PWA_THEME_COLORS.dark}':'${PWA_THEME_COLORS.light}';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c);else{m=document.createElement('meta');m.name='theme-color';m.content=c;document.head.appendChild(m);}}catch(e){}})();`;
