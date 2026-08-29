import { compareSecretaryBoardTasks } from '@/lib/secretary/visible-board-tasks';
import type { SecretaryTask } from '@/lib/secretary/types';

export function sortTasksByGlobalOrder(
  tasks: SecretaryTask[],
  orderedIds: string[],
): SecretaryTask[] {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));

  return [...tasks].toSorted((a, b) => {
    const rankA = rank.get(a.id);
    const rankB = rank.get(b.id);
    const hasA = rankA !== undefined;
    const hasB = rankB !== undefined;

    if (hasA && hasB) return rankA - rankB;
    if (hasA) return -1;
    if (hasB) return 1;
    return compareSecretaryBoardTasks(a, b);
  });
}

export function orderedTasksFromIds(
  actionableTasks: SecretaryTask[],
  orderedIds: string[],
): SecretaryTask[] {
  const byId = new Map(actionableTasks.map((task) => [task.id, task]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((task): task is SecretaryTask => task !== undefined);
}
