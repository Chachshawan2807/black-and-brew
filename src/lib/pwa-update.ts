/** Service worker update lifecycle — keep client bundle in sync after skipWaiting(). */

let reloadScheduled = false;

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
    // Non-fatal — e.g. offline or dev without SW
  }
}
