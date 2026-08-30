export type PwaInstallMode = 'native' | 'ios-manual' | 'hidden';

/** Install UX must not block on storage wipe that breaks Chromium prompts and hangs on mobile. */
export function shouldBlockInstallOnStorageReset(): boolean {
  return false;
}

export function shouldShowPreparingState(mode: PwaInstallMode): boolean {
  return mode === 'native';
}

export function shouldResetStorageAfterAcceptedInstall(mode: PwaInstallMode): boolean {
  return mode === 'native';
}
