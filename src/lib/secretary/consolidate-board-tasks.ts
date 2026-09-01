import { normalizeSuggestionTitle } from '@/lib/secretary/dedupe-against-existing';
import {
  formatWorkSessionSubLabel,
  resolveWorkSession,
} from '@/lib/secretary/task-work-sessions';
import {
  compareSecretaryBoardTasks,
  type SecretaryBoardVisibilityOptions,
  filterVisibleSecretaryBoardTasks,
  isSecretaryBoardTaskVisible,
} from '@/lib/secretary/visible-board-tasks';
import type { SecretaryTask } from '@/lib/secretary/types';

export type SecretaryBoardDisplayTask = SecretaryTask & {
  consolidatedTaskIds: string[];
  consolidatedSections?: Array<{ title: string; description: string | null }>;
};

export function boardTaskConsolidationKey(task: SecretaryTask): string {
  const session = resolveWorkSession(task);
  if (session) return `session:${session.id}`;

  if (task.task_type !== 'custom') {
    return task.task_type;
  }
  return `custom:${task.module}:${normalizeSuggestionTitle(task.title)}`;
}

function appendConsolidatedCount(title: string, count: number): string {
  if (count <= 1) return title;
  if (/\(\d+\s*รายการ\)\s*$/.test(title) || /\(\d+\)\s*$/.test(title)) {
    return title;
  }
  return `${title} (${count})`;
}

function buildConsolidatedDisplayTask(
  sorted: SecretaryTask[],
): SecretaryBoardDisplayTask {
  const primary = sorted[0]!;
  const consolidatedTaskIds = sorted.map((task) => task.id);
  const session = resolveWorkSession(primary);

  if (session && sorted.length > 1) {
    return {
      ...primary,
      title: session.label,
      description: null,
      consolidatedTaskIds,
      consolidatedSections: sorted.map((task) => ({
        title: formatWorkSessionSubLabel(task, session),
        description: task.description,
      })),
    };
  }

  return {
    ...primary,
    title: appendConsolidatedCount(primary.title, consolidatedTaskIds.length),
    consolidatedTaskIds,
  };
}

export function consolidateSecretaryBoardTasks(
  tasks: SecretaryTask[],
): SecretaryBoardDisplayTask[] {
  const groups = new Map<string, SecretaryTask[]>();

  for (const task of tasks) {
    const key = boardTaskConsolidationKey(task);
    const bucket = groups.get(key) ?? [];
    bucket.push(task);
    groups.set(key, bucket);
  }

  const consolidated = [...groups.values()].map((group) =>
    buildConsolidatedDisplayTask(group.toSorted(compareSecretaryBoardTasks)),
  );

  return consolidated.toSorted(compareSecretaryBoardTasks);
}

export function filterConsolidatedSecretaryBoardTasks(
  tasks: SecretaryTask[],
  moduleFilter: 'all' | SecretaryTask['module'],
  options: SecretaryBoardVisibilityOptions,
): SecretaryBoardDisplayTask[] {
  return consolidateSecretaryBoardTasks(
    filterVisibleSecretaryBoardTasks(tasks, moduleFilter, options),
  );
}

export function countConsolidatedSecretaryBoardTasks(
  tasks: SecretaryTask[],
  moduleFilter: 'all' | SecretaryTask['module'],
  options: SecretaryBoardVisibilityOptions,
): number {
  if (moduleFilter === 'all') {
    return filterConsolidatedSecretaryBoardTasks(tasks, 'all', options).length;
  }

  const visible = tasks.filter((task) => isSecretaryBoardTaskVisible(task, moduleFilter, options));
  return consolidateSecretaryBoardTasks(visible).length;
}

export function countConsolidatedSecretaryBoardTasksByModule(
  tasks: SecretaryTask[],
  module: SecretaryTask['module'],
  options: SecretaryBoardVisibilityOptions,
): number {
  return countConsolidatedSecretaryBoardTasks(tasks, module, options);
}
