import { preloadSecretaryManualTaskDialog } from '@/lib/preload-secretary-manual-task-dialog';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import type { SecretaryTask } from '@/lib/secretary/types';

let shellPreloaded = false;

/** Warm manual task dialog before the user opens a card. */
export function preloadSecretaryOverlayForTask(
  task: Pick<SecretaryTask, 'source_kind'>,
): void {
  if (isManualSecretaryTask(task as SecretaryTask)) {
    preloadSecretaryManualTaskDialog();
  }
}

/** Warm the secretary overlay route shell once per session. */
export function preloadSecretaryTaskOverlayShell(): void {
  if (shellPreloaded) return;
  shellPreloaded = true;
  void import('@/app/[locale]/home/_components/SecretaryTaskOverlay');
}

/** @internal Vitest only */
export function resetSecretaryOverlayPreloadForTests(): void {
  shellPreloaded = false;
}
