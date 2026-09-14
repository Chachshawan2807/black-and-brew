import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

/** Detail body for secretary task overlays. Snapshot is accepted for call-site compatibility. */
export function resolveSecretaryTaskDetailText(
  task: SecretaryTask,
  _snapshot?: Pick<SecretarySnapshot, 'operational' | 'itemsToOrder'>,
): string | null {
  const description = task.description?.trim();
  return description ? description : null;
}
