import type { SecretaryTask } from '@/lib/secretary/types';

export function validateAiTaskOrder(input: {
  orderedIds: string[];
  actionableTasks: SecretaryTask[];
}): boolean {
  const { orderedIds, actionableTasks } = input;
  if (orderedIds.length !== actionableTasks.length) return false;

  const expected = new Set(actionableTasks.map((task) => task.id));
  const seen = new Set<string>();

  for (const id of orderedIds) {
    if (!expected.has(id) || seen.has(id)) return false;
    seen.add(id);
  }

  const inProgress = actionableTasks.find((task) => task.status === 'in_progress');
  if (inProgress && orderedIds[0] !== inProgress.id) {
    return false;
  }

  return true;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = /\{[\s\S]*\}/.exec(trimmed);
    if (!match) throw new Error('No JSON object in AI response');
    return JSON.parse(match[0]);
  }
}
