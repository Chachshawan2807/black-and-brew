import { PWA_BRAND_ICON_512, PWA_MANIFEST_BACKGROUND } from '@/lib/pwa-assets';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
import { PWA_THEME_COLORS, isAndroidWebKit, isIosWebKit } from '@/lib/pwa-standalone';

export const PWA_LAUNCH_SPLASH_ROOT_ID = 'bb-pwa-launch-splash';
export const PWA_LAUNCH_SPLASH_CLASS = 'bb-pwa-launch-splash';
export const PWA_LAUNCH_SPLASH_DISMISS_CLASS = 'bb-pwa-launch-splash--dismissed';
export const PWA_LAUNCH_SPLASH_DARK_CLASS = 'bb-pwa-launch-splash--dark';
/** Minimum time logo + app name stay visible before revealing the app shell. */
export const PWA_LAUNCH_SPLASH_MIN_VISIBLE_MS = 3000;

/** Installed iOS home-screen PWA (legacy helper). */
export function shouldShowIosPwaLaunchSplash(input: {
  userAgent: string;
  isStandalone: boolean;
}): boolean {
  return input.isStandalone && isIosWebKit(input.userAgent);
}

/** Installed iOS or Android home-screen PWA in-app launch overlay. */
export function shouldShowPwaLaunchSplash(input: {
  userAgent: string;
  isStandalone: boolean;
}): boolean {
  if (!input.isStandalone) return false;
  return isIosWebKit(input.userAgent) || isAndroidWebKit(input.userAgent);
}

/**
 * Inline script: branded launch overlay before React hydrates (shortcut + cold start).
 * Must stay in sync with globals.css `.bb-pwa-launch-splash` rules.
 */
export const PWA_IOS_LAUNCH_SPLASH_SCRIPT = `(function(){try{var ua=navigator.userAgent;var ios=/iPhone|iPad|iPod/i.test(ua);var android=/Android/i.test(ua);var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;if(!(s&&(ios||android)))return;var t=localStorage.getItem('bb-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var root=document.createElement('div');root.id='${PWA_LAUNCH_SPLASH_ROOT_ID}';root.className='${PWA_LAUNCH_SPLASH_CLASS}';root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.style.backgroundColor=d?'${PWA_THEME_COLORS.dark}':'${PWA_MANIFEST_BACKGROUND}';if(d)root.classList.add('${PWA_LAUNCH_SPLASH_DARK_CLASS}');var img=document.createElement('img');img.src='${PWA_BRAND_ICON_512}';img.alt='';img.width=120;img.height=120;img.decoding='sync';img.fetchPriority='high';var title=document.createElement('p');title.className='bb-pwa-launch-splash__title';title.textContent=${JSON.stringify(PWA_DISPLAY_NAME)};root.appendChild(img);root.appendChild(title);document.body.insertBefore(root,document.body.firstChild);var shownAt=Date.now();var minVisible=${PWA_LAUNCH_SPLASH_MIN_VISIBLE_MS};var dismissed=false;var dismissTimer=null;function dismiss(){if(dismissed||!root.parentNode)return;dismissed=true;root.classList.add('${PWA_LAUNCH_SPLASH_DISMISS_CLASS}');var fade=reduced?0:280;window.setTimeout(function(){root.remove();},fade);}function scheduleDismiss(){var wait=Math.max(0,minVisible-(Date.now()-shownAt));if(dismissTimer)window.clearTimeout(dismissTimer);dismissTimer=window.setTimeout(dismiss,wait);}window.addEventListener('pageshow',function(e){if(e.persisted)dismiss();});window.addEventListener('load',scheduleDismiss);scheduleDismiss();}catch(e){}})();`;
