import type { SecretaryTask } from '@/lib/secretary/types';

/** Detail body for secretary task overlays (not card surface). */
export function resolveSecretaryTaskDetailText(task: SecretaryTask): string | null {
  const description = task.description?.trim();
  if (description) return description;

  if (
    task.source_kind === 'ai_suggested' &&
    task.metadata &&
    typeof task.metadata.rationale === 'string'
  ) {
    const rationale = task.metadata.rationale.trim();
    return rationale || null;
  }

  return null;
}
