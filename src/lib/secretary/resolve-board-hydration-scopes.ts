import {
  SCOPE_MODULES,
  type SecretarySyncScope,
} from '@/lib/secretary/board-sync-scope';
import type { SecretaryModule, SecretaryTask } from '@/lib/secretary/types';

const MODULE_TO_DATA_SCOPE = new Map<SecretaryModule, Exclude<SecretarySyncScope, 'tasks'>>();

for (const [scope, modules] of Object.entries(SCOPE_MODULES) as [
  Exclude<SecretarySyncScope, 'tasks'>,
  SecretaryModule[],
][]) {
  for (const secretaryModule of modules) {
    MODULE_TO_DATA_SCOPE.set(secretaryModule, scope);
  }
}

/** Snapshot slices needed to render overlays for tasks currently on the home board. */
export function resolveSnapshotScopesForBoardTasks(
  tasks: readonly Pick<SecretaryTask, 'module'>[],
): Exclude<SecretarySyncScope, 'tasks'>[] {
  const scopes = new Set<Exclude<SecretarySyncScope, 'tasks'>>();
  for (const task of tasks) {
    const scope = MODULE_TO_DATA_SCOPE.get(task.module);
    if (scope) scopes.add(scope);
  }
  return [...scopes];
}
