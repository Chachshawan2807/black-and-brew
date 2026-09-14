import type { SecretaryTask } from '@/lib/secretary/types';

/** Detail body for secretary manual task overlays. */
export function resolveSecretaryTaskDetailText(task: SecretaryTask): string | null {
  const description = task.description?.trim();
  return description ? description : null;
}
