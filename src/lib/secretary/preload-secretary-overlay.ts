import { preloadPurchaseOrdersModal } from '@/lib/preload-purchase-orders-modal';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import {
  prefetchBeanOrdersForOverlay,
  prefetchScheduleOverlayData,
} from '@/lib/secretary/overlay-data-cache';
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
    case 'bean_orders_panel':
      void Promise.all([
        import('@/app/[locale]/secretary/_components/BeanOrdersOverlay'),
        import('@/app/[locale]/bean-orders/BeanOrdersClient'),
        import('@/app/[locale]/bean-orders/BeanOrderDetailClient'),
      ]);
      prefetchBeanOrdersForOverlay();
      break;
    case 'branch_withdraw_panel':
      void Promise.all([
        import('@/app/[locale]/secretary/_components/BranchWithdrawOverlay'),
        import('@/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient'),
      ]);
      break;
    case 'schedule_panel':
      void Promise.all([
        import('@/app/[locale]/secretary/_components/ScheduleOverlay'),
        import('@/app/[locale]/schedule/ScheduleClient'),
      ]);
      prefetchScheduleOverlayData();
      break;
    case 'maintenance_list':
      void import('@/app/[locale]/secretary/_components/SecretaryTaskListOverlay');
      break;
    case 'task_info':
      void import('@/app/[locale]/secretary/_components/SecretaryTaskInfoOverlay');
      break;
    default:
      break;
  }
}

/** Warm overlay shell + task-specific chunks and data before the user opens a card. */
export function preloadSecretaryOverlayForTask(
  task: Pick<SecretaryTask, 'task_type' | 'source_kind'>,
): void {
  if (task.source_kind === 'ai_suggested') return;

  if (isManualSecretaryTask(task as SecretaryTask)) {
    void import('@/app/[locale]/secretary/_components/SecretaryManualTaskDialog');
    return;
  }

  const kind = resolveSecretaryTaskOverlayKind(task as SecretaryTask);
  if (!kind) return;

  preloadOverlayChunks(kind);
}

/** Warm the secretary overlay route shell once per session. */
export function preloadSecretaryTaskOverlayShell(): void {
  if (preloadedChunks.has('shell')) return;
  preloadedChunks.add('shell');
  void import('@/app/[locale]/secretary/_components/SecretaryTaskOverlay');
}

/** @internal Vitest only */
export function resetSecretaryOverlayPreloadForTests(): void {
  preloadedChunks.clear();
}
