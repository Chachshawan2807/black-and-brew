import type { SecretaryTask } from '@/lib/secretary/types';

/** Detail body for secretary task overlays (not card surface). */
export function resolveSecretaryTaskDetailText(task: SecretaryTask): string | null {
  const description = task.description?.trim();
  if (description) return description;

  return null;
}
