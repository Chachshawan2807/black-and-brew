import type { SecretaryModule, SecretaryTask, SecretaryTaskType } from '@/lib/secretary/types';

export type SecretaryWorkSession = {
  id: string;
  label: string;
  module: SecretaryModule;
  taskTypes: readonly SecretaryTaskType[];
  /** Strip from task titles when showing sub-labels inside a grouped guidance step. */
  titlePrefix?: string;
  rationale: string;
};

export const SECRETARY_WORK_SESSIONS: readonly SecretaryWorkSession[] = [
  {
    id: 'schedule_review',
    label: 'ตรวจตารางงาน',
    module: 'schedule',
    taskTypes: ['schedule_understaffed', 'schedule_leave_risk'],
    titlePrefix: 'ตรวจตาราง — ',
    rationale: 'ข้อมูลวันที่คนน้อยและลาหลายคนอยู่ในหน้าตารางงาน — เปิดครั้งเดียวตรวจได้',
  },
] as const;

const SESSION_BY_TASK_TYPE = new Map<SecretaryTaskType, SecretaryWorkSession>(
  SECRETARY_WORK_SESSIONS.flatMap((session) =>
    session.taskTypes.map((taskType) => [taskType, session] as const),
  ),
);

export function resolveWorkSession(task: Pick<SecretaryTask, 'task_type'>): SecretaryWorkSession | null {
  return SESSION_BY_TASK_TYPE.get(task.task_type) ?? null;
}

export function formatWorkSessionSubLabel(
  task: Pick<SecretaryTask, 'title'>,
  session: SecretaryWorkSession,
): string {
  if (session.titlePrefix && task.title.startsWith(session.titlePrefix)) {
    return task.title.slice(session.titlePrefix.length);
  }
  return task.title;
}

export type GuidanceStep =
  | { kind: 'single'; tasks: [SecretaryTask] }
  | { kind: 'session'; session: SecretaryWorkSession; tasks: SecretaryTask[] };

/** Collapse consecutive actionable tasks that share a work session into one guidance step. */
export function groupTasksIntoGuidanceSteps(tasks: SecretaryTask[]): GuidanceStep[] {
  const steps: GuidanceStep[] = [];
  let index = 0;

  while (index < tasks.length) {
    const task = tasks[index]!;
    const session = resolveWorkSession(task);

    if (!session) {
      steps.push({ kind: 'single', tasks: [task] });
      index += 1;
      continue;
    }

    const grouped: SecretaryTask[] = [task];
    index += 1;
    while (index < tasks.length) {
      const next = tasks[index]!;
      const nextSession = resolveWorkSession(next);
      if (!nextSession || nextSession.id !== session.id) break;
      grouped.push(next);
      index += 1;
    }

    if (grouped.length === 1) {
      steps.push({ kind: 'single', tasks: [grouped[0]!] });
      continue;
    }

    steps.push({ kind: 'session', session, tasks: grouped });
  }

  return steps;
}

export function formatGuidanceStep(step: GuidanceStep): string {
  if (step.kind === 'single') {
    return `"${step.tasks[0].title}"`;
  }

  const subLabels = step.tasks.map((task) => formatWorkSessionSubLabel(task, step.session));
  return `"${step.session.label}" (${subLabels.join(' และ ')})`;
}

export function formatGuidanceStepsSequence(steps: GuidanceStep[]): string {
  if (steps.length === 0) return '';
  if (steps.length === 1) return formatGuidanceStep(steps[0]!);

  const parts = steps.map((step) => formatGuidanceStep(step));
  const last = parts.pop()!;
  return `${parts.join(' แล้วต่อด้วย ')} แล้วต่อด้วย ${last}`;
}

export function buildWorkSessionPromptLines(): string[] {
  return SECRETARY_WORK_SESSIONS.map(
    (session) =>
      `- ${session.label} (${session.taskTypes.join(', ')}): ${session.rationale}`,
  );
}
