import { deriveBeanOrderTasks } from '@/lib/secretary/rules/bean-orders-rules';
import { deriveInsightBridgeTasks } from '@/lib/secretary/rules/insight-rules';
import { deriveInventoryTasks } from '@/lib/secretary/rules/inventory-rules';
import { deriveMaintenanceTasks } from '@/lib/secretary/rules/maintenance-rules';
import { deriveScheduleTasks } from '@/lib/secretary/rules/schedule-rules';
import type { SecretarySyncScope } from '@/lib/secretary/board-sync-scope';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

const RULE_MODULES = [
  deriveScheduleTasks,
  deriveInventoryTasks,
  deriveBeanOrderTasks,
  deriveMaintenanceTasks,
  deriveInsightBridgeTasks,
] as const;

const SCOPED_RULE_MODULES: Record<
  Exclude<SecretarySyncScope, 'tasks'>,
  (snapshot: SecretarySnapshot) => DerivedTaskDraft[]
> = {
  schedule: deriveScheduleTasks,
  inventory: deriveInventoryTasks,
  bean_orders: deriveBeanOrderTasks,
  maintenance: deriveMaintenanceTasks,
};

export function deriveTasksFromSnapshot(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  return RULE_MODULES.flatMap((derive) => derive(snapshot));
}

export function deriveTasksFromSnapshotByScopes(
  snapshot: SecretarySnapshot,
  scopes: readonly Exclude<SecretarySyncScope, 'tasks'>[],
): DerivedTaskDraft[] {
  const seen = new Set<string>();
  const drafts: DerivedTaskDraft[] = [];

  for (const scope of scopes) {
    for (const draft of SCOPED_RULE_MODULES[scope](snapshot)) {
      if (seen.has(draft.sourceRefHash)) continue;
      seen.add(draft.sourceRefHash);
      drafts.push(draft);
    }
  }

  return drafts;
}
