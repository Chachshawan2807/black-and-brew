import { preloadPurchaseOrdersModal } from '@/lib/preload-purchase-orders-modal';
import { preloadSecretaryManualTaskDialog } from '@/lib/preload-secretary-manual-task-dialog';
import {
  prefetchBeanOrdersForOverlay,
  prefetchScheduleOverlayData,
} from '@/lib/secretary/overlay-data-cache';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import {
  resolveSecretaryTaskOverlayKind,
  type SecretaryTaskOverlayKind,
} from '@/lib/secretary/resolve-task-overlay';
import type { SecretaryTask } from '@/lib/secretary/types';

const preloadedChunks = new Set<SecretaryTaskOverlayKind | 'shell'>();

function preloadOverlayChunks(kind: SecretaryTaskOverlayKind): void {
  if (preloadedChunks.has(kind)) return;
  preloadedChunks.add(kind);

  switch (kind) {
    case 'purchase_orders':
      preloadPurchaseOrdersModal();
      break;
    case 'bean_orders_list':
      void prefetchBeanOrdersForOverlay();
      void import('@/app/[locale]/home/_components/SecretaryTaskListOverlay');
      break;
    case 'schedule_review_list':
      void prefetchScheduleOverlayData();
      void import('@/app/[locale]/home/_components/SecretaryTaskListOverlay');
      break;
    case 'maintenance_list':
      void import('@/app/[locale]/home/_components/SecretaryTaskListOverlay');
      break;
    case 'task_info':
      void import('@/app/[locale]/home/_components/SecretaryTaskInfoOverlay');
      break;
    default:
      break;
  }
}

/** Warm overlay shell + task-specific chunks and data before the user opens a card. */
export function preloadSecretaryOverlayForTask(
  task: Pick<SecretaryTask, 'task_type' | 'source_kind'>,
): void {
  if (isManualSecretaryTask(task as SecretaryTask)) {
    preloadSecretaryManualTaskDialog();
    return;
  }

  const kind = resolveSecretaryTaskOverlayKind(task as SecretaryTask);
  if (!kind || kind === 'branch_withdraw_panel') return;

  preloadOverlayChunks(kind);
}

/** Warm the secretary overlay route shell once per session. */
export function preloadSecretaryTaskOverlayShell(): void {
  if (preloadedChunks.has('shell')) return;
  preloadedChunks.add('shell');
  void import('@/app/[locale]/home/_components/SecretaryTaskOverlay');
}

type MediaQuerySource = {
  matchMedia: (query: string) => { matches: boolean };
};

/**
 * Idle overlay warming competes with the home fetch on phones.
 * Keep pointerdown warmup; skip the idle list preload on coarse pointers.
 */
export function shouldIdlePreloadSecretaryOverlays(
  media: MediaQuerySource | null = typeof window === 'undefined' ? null : window,
): boolean {
  if (!media?.matchMedia) return true;
  try {
    return !media.matchMedia('(pointer: coarse)').matches;
  } catch {
    return true;
  }
}

/** @internal Vitest only */
export function resetSecretaryOverlayPreloadForTests(): void {
  preloadedChunks.clear();
}
