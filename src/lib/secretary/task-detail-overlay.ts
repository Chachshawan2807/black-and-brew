import type { SecretaryTask } from '@/lib/secretary/types';

/**
 * Secretary task detail baseline: open embedded sub-windows for editable work, never navigate away.
 * Exception: maintenance cards use a read-only detail list (SecretaryTaskListOverlay), not the full maintenance page.
 */

export type SecretaryAttentionListItem = {
  id: string;
  primary: string;
  secondary?: string;
  needsAttention?: boolean;
};

export function canOpenSecretaryTaskDetail(
  task: Pick<SecretaryTask, 'source_kind'>,
): boolean {
  return task.source_kind !== 'ai_suggested';
}

export function markSecretaryAttentionItem(
  item: SecretaryAttentionListItem,
): SecretaryAttentionListItem {
  return { ...item, needsAttention: true };
}
