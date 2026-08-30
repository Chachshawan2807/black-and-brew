import type { SecretaryTask } from '@/lib/secretary/types';

export function isManualSecretaryTask(task: SecretaryTask): boolean {
  return task.source_kind === 'manual';
}
