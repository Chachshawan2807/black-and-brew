/** Service worker update lifecycle keep client bundle in sync after skipWaiting(). */

import { PWA_SERVICE_WORKER_PATH } from '@/lib/pwa-config';
import { canRegisterServiceWorker } from '@/lib/pwa-notification-bridge';

let reloadScheduled = false;
let pushSwReadyPromise: Promise<ServiceWorkerRegistration> | null = null;

export function installServiceWorkerUpdateListener(): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const onControllerChange = () => {
    if (reloadScheduled) return;
    reloadScheduled = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  };
}

export async function checkForServiceWorkerUpdate(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  } catch {
    // Non-fatal e.g. offline or dev without SW
  }
}

/** Remove production SW left over in dev it caches stale Turbopack chunks. */
/**
 * Ensures the push service worker is registered and active.
 * User-gesture push registration cannot wait on PwaRegister's idle deferral.
 */
export function ensurePushServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('service_worker_unsupported'));
  }

  if (!canRegisterServiceWorker()) {
    return navigator.serviceWorker.ready;
  }

  if (!pushSwReadyPromise) {
    pushSwReadyPromise = navigator.serviceWorker
      .register(PWA_SERVICE_WORKER_PATH, { updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .catch((error) => {
        pushSwReadyPromise = null;
        throw error;
      });
  }

  return pushSwReadyPromise;
}

export async function unregisterOrphanedServiceWorkersInDev(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV === 'production') return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}
