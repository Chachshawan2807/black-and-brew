import { resolveSecretaryTaskDetailText } from '@/lib/secretary/resolve-task-detail-text';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

function parseInfoLine(line: string): Pick<SecretaryAttentionListItem, 'primary' | 'secondary'> {
  const colonIndex = line.indexOf(':');
  if (colonIndex > 0 && colonIndex < line.length - 1) {
    const label = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (label && value) {
      return { primary: label, secondary: value };
    }
  }
  return { primary: line };
}

function splitInfoSegments(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  const singleLine = lines[0] ?? '';
  if (!singleLine.includes(' · ')) return singleLine ? [singleLine] : [];

  return singleLine
    .split(' · ')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Read-only text-only secretary task rows for table detail overlay. */
export function buildTaskInfoListItems(
  task: Pick<SecretaryTask, 'id' | 'task_type' | 'description' | 'source_ref'>,
  snapshot?: Pick<SecretarySnapshot, 'operational' | 'itemsToOrder'>,
): SecretaryAttentionListItem[] {
  const text = resolveSecretaryTaskDetailText(task, snapshot);
  if (!text) return [];

  return splitInfoSegments(text).map((segment, index) => {
    const parsed = parseInfoLine(segment);
    return {
      id: `${task.id}-info-${index}`,
      ...parsed,
    };
  });
}
