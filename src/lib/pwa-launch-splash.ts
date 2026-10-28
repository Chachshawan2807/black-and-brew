import { PWA_BRAND_ICON_512, PWA_MANIFEST_BACKGROUND } from '@/lib/pwa-assets';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
import { PWA_THEME_COLORS, isIosWebKit } from '@/lib/pwa-standalone';

export const PWA_LAUNCH_SPLASH_ROOT_ID = 'bb-pwa-launch-splash';
export const PWA_LAUNCH_SPLASH_CLASS = 'bb-pwa-launch-splash';
export const PWA_LAUNCH_SPLASH_DISMISS_CLASS = 'bb-pwa-launch-splash--dismissed';
export const PWA_LAUNCH_SPLASH_DARK_CLASS = 'bb-pwa-launch-splash--dark';
export const PWA_LAUNCH_SPLASH_MAX_VISIBLE_MS = 2200;

/** iOS home-screen PWA only (Android uses manifest-native splash). */
export function shouldShowIosPwaLaunchSplash(input: {
  userAgent: string;
  isStandalone: boolean;
}): boolean {
  return input.isStandalone && isIosWebKit(input.userAgent);
}

/**
 * Inline script: branded launch overlay before React hydrates (shortcut + cold start).
 * Must stay in sync with globals.css `.bb-pwa-launch-splash` rules.
 */
export const PWA_IOS_LAUNCH_SPLASH_SCRIPT = `(function(){try{var ua=navigator.userAgent;var ios=/iPhone|iPad|iPod/i.test(ua);var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;if(!(ios&&s))return;var t=localStorage.getItem('bb-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var root=document.createElement('div');root.id='${PWA_LAUNCH_SPLASH_ROOT_ID}';root.className='${PWA_LAUNCH_SPLASH_CLASS}';root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.style.backgroundColor=d?'${PWA_THEME_COLORS.dark}':'${PWA_MANIFEST_BACKGROUND}';if(d)root.classList.add('${PWA_LAUNCH_SPLASH_DARK_CLASS}');var img=document.createElement('img');img.src='${PWA_BRAND_ICON_512}';img.alt='';img.width=120;img.height=120;img.decoding='sync';img.fetchPriority='high';var title=document.createElement('p');title.className='bb-pwa-launch-splash__title';title.textContent=${JSON.stringify(PWA_DISPLAY_NAME)};root.appendChild(img);root.appendChild(title);document.body.insertBefore(root,document.body.firstChild);var dismissed=false;function dismiss(){if(dismissed||!root.parentNode)return;dismissed=true;root.classList.add('${PWA_LAUNCH_SPLASH_DISMISS_CLASS}');var fade=reduced?0:280;window.setTimeout(function(){root.remove();},fade);}window.addEventListener('pageshow',function(e){if(e.persisted)dismiss();});window.addEventListener('load',function(){window.requestAnimationFrame(function(){window.requestAnimationFrame(dismiss);});});window.setTimeout(dismiss,${PWA_LAUNCH_SPLASH_MAX_VISIBLE_MS});}catch(e){}})();`;
