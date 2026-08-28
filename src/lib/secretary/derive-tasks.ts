import type { DerivedTaskDraft } from '@/lib/secretary/types';

export type DerivedTaskExistingRow = {
  id: string;
  status: string;
  scheduled_date: string;
  metadata?: Record<string, unknown> | null;
};

export type DerivedTaskUpsertDecision =
  | { action: 'insert'; row: Record<string, unknown> }
  | { action: 'update'; id: string; patch: Record<string, unknown> }
  | { action: 'skip' };

function buildDerivedTaskPatch(
  row: Record<string, unknown>,
  scheduledDate: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    title: row.title,
    description: row.description,
    priority: row.priority,
    module: row.module,
    source_ref: row.source_ref,
    action_href: row.action_href,
    metadata: row.metadata,
    scheduled_date: scheduledDate,
    updated_at: row.updated_at,
    ...extra,
  };
}

/** Rolls past-due derived rows onto today; keeps future scheduled dates (AI defer). */
export function resolveDerivedTaskScheduledDate(
  existingScheduledDate: string,
  todayIso: string,
): string {
  return existingScheduledDate < todayIso ? todayIso : existingScheduledDate;
}

export function resolveDerivedTaskUpsert(
  draft: DerivedTaskDraft,
  scheduledDate: string,
  existing: DerivedTaskExistingRow | null,
): DerivedTaskUpsertDecision {
  const row = draftsToUpsertRows([draft], scheduledDate)[0];

  if (!existing) {
    return { action: 'insert', row };
  }

  const targetScheduledDate = resolveDerivedTaskScheduledDate(
    existing.scheduled_date,
    scheduledDate,
  );

  if (existing.status === 'done' || existing.status === 'skipped') {
    if (existing.scheduled_date < scheduledDate) {
      return {
        action: 'update',
        id: existing.id,
        patch: buildDerivedTaskPatch(row, scheduledDate, {
          status: 'pending',
          completed_at: null,
          completed_by: null,
          active_session_started_at: null,
        }),
      };
    }

    if (existing.metadata?.autoCompleted === true) {
      return {
        action: 'update',
        id: existing.id,
        patch: buildDerivedTaskPatch(row, scheduledDate, {
          status: 'pending',
          completed_at: null,
          completed_by: null,
          active_session_started_at: null,
          metadata: {
            ...(draft.metadata ?? {}),
            estimatedMinutes: draft.estimatedMinutes ?? null,
          },
        }),
      };
    }

    return { action: 'skip' };
  }

  return {
    action: 'update',
    id: existing.id,
    patch: buildDerivedTaskPatch(row, targetScheduledDate),
  };
}

export function draftsToUpsertRows(
  drafts: DerivedTaskDraft[],
  scheduledDate: string,
): Array<Record<string, unknown>> {
  return drafts.map((draft) => ({
    task_type: draft.taskType,
    title: draft.title,
    description: draft.description ?? null,
    priority: draft.priority,
    status: 'pending',
    module: draft.module,
    scheduled_date: scheduledDate,
    source_kind: 'derived',
    source_ref: draft.sourceRef,
    source_ref_hash: draft.sourceRefHash,
    action_href: draft.actionHref ?? null,
    metadata: {
      ...(draft.metadata ?? {}),
      estimatedMinutes: draft.estimatedMinutes ?? null,
    },
    updated_at: new Date().toISOString(),
  }));
}

export function resolveStaleDerivedHashes(
  activeHashes: Set<string>,
  existingHashes: string[],
): string[] {
  return existingHashes.filter((hash) => !activeHashes.has(hash));
}
