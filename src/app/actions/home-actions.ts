'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SecretaryBoardSyncPlan } from '@/lib/secretary/board-sync-scope';
import { buildMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import { retirePendingDerivedSecretaryTasks } from '@/lib/secretary/retire-pending-derived-secretary-tasks';
import { nextScheduledDateIso } from '@/lib/secretary/defer-tasks';
import type {
  SecretarySnapshot,
  SecretaryTask,
  SecretaryTaskPriority,
  SecretaryTaskStatus,
} from '@/lib/secretary/types';
import { gateMutation, requireReadAccess } from '@/lib/policies/server-gate';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';

const TASK_SELECT =
  'id, task_type, title, description, priority, status, module, due_at, scheduled_date, assignee_profile_id, source_kind, source_ref, source_ref_hash, action_href, metadata, completed_at, completed_by, snoozed_until, active_session_started_at, created_at, updated_at';

function isOperationalTasksTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205') return true;
  return Boolean(error.message?.includes("Could not find the table 'public.operational_tasks'"));
}

function mapRow(row: Record<string, unknown>): SecretaryTask {
  return {
    id: String(row.id),
    task_type: row.task_type as SecretaryTask['task_type'],
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    priority: row.priority as SecretaryTaskPriority,
    status: row.status as SecretaryTaskStatus,
    module: row.module as SecretaryTask['module'],
    due_at: row.due_at ? String(row.due_at) : null,
    scheduled_date: String(row.scheduled_date),
    assignee_profile_id: row.assignee_profile_id ? String(row.assignee_profile_id) : null,
    source_kind: row.source_kind as SecretaryTask['source_kind'],
    source_ref: (row.source_ref as Record<string, unknown>) ?? null,
    source_ref_hash: row.source_ref_hash ? String(row.source_ref_hash) : null,
    action_href: row.action_href ? String(row.action_href) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    completed_by: row.completed_by ? String(row.completed_by) : null,
    snoozed_until: row.snoozed_until ? String(row.snoozed_until) : null,
    active_session_started_at: row.active_session_started_at
      ? String(row.active_session_started_at)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchSecretaryTasks(dateIso: string): Promise<{
  success: boolean;
  tasks?: SecretaryTask[];
  error?: string;
}> {
  const authError = await requireReadAccess();
  if (authError) return { success: false, error: authError };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .select(TASK_SELECT)
      .eq('scheduled_date', dateIso)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      if (isOperationalTasksTableMissing(error)) {
        return { success: true, tasks: [] };
      }
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      tasks: (data ?? [])
        .filter(
          (row) =>
            String(row.source_kind) !== 'ai_suggested' && String(row.source_kind) !== 'derived',
        )
        .map(mapRow),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[fetchSecretaryTasks]', message);
    return { success: false, error: message };
  }
}

export async function countPendingSecretaryTasks(dateIso: string): Promise<number> {
  const authError = await requireReadAccess();
  if (authError) return 0;

  try {
    const now = new Date().toISOString();
    const { count, error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('scheduled_date', dateIso)
      .eq('source_kind', 'manual')
      .eq('status', 'pending')
      .or(`snoozed_until.is.null,snoozed_until.lte.${now}`);

    if (error) {
      if (isOperationalTasksTableMissing(error)) return 0;
      console.error('Supabase Error:', error.message, error.details);
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Privileged cleanup: skip pending derived rows for the work day (manual board only). */
export async function retireDerivedSecretaryTasksForDay(opts?: {
  dateIso?: string;
  locale?: string;
}): Promise<{ success: boolean; retired?: number; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const dateIso = opts?.dateIso ?? todayIsoBkk();
  const result = await retirePendingDerivedSecretaryTasks(dateIso);
  if (result.success) {
    const locale = opts?.locale ?? 'th';
    revalidatePath(`/${locale}/secretary`);
  }
  return result;
}

const manualTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['urgent', 'normal', 'low']).default('normal'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
});

export async function createManualSecretaryTask(
  input: z.infer<typeof manualTaskSchema>,
): Promise<{ success: boolean; task?: SecretaryTask; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const parsed = manualTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid task payload' };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .insert({
        task_type: 'custom',
        title: parsed.data.title,
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
        priority: parsed.data.priority,
        status: 'pending',
        module: 'custom',
        scheduled_date: parsed.data.scheduledDate,
        source_kind: 'manual',
        metadata: parsed.data.estimatedMinutes
          ? { estimatedMinutes: parsed.data.estimatedMinutes }
          : null,
      })
      .select(TASK_SELECT)
      .single();

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    revalidatePath('/th/secretary');
    revalidatePath('/en/secretary');
    return { success: true, task: mapRow(data as Record<string, unknown>) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

const updateManualTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export async function updateManualSecretaryTask(
  input: z.infer<typeof updateManualTaskSchema>,
): Promise<{ success: boolean; task?: SecretaryTask; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const parsed = updateManualTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid task payload' };

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .update({
        title: parsed.data.title,
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.taskId)
      .eq('source_kind', 'manual')
      .select(TASK_SELECT)
      .single();

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    revalidatePath('/th/secretary');
    revalidatePath('/en/secretary');
    return { success: true, task: mapRow(data as Record<string, unknown>) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function deferSecretaryTasksToNextDay(
  taskIds: string[],
  fromDateIso: string,
): Promise<{ success: boolean; deferred?: number; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  if (taskIds.length === 0) {
    return { success: true, deferred: 0 };
  }

  const nextDate = nextScheduledDateIso(fromDateIso);
  const now = new Date().toISOString();

  try {
    const { error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .update({
        scheduled_date: nextDate,
        status: 'pending',
        active_session_started_at: null,
        updated_at: now,
      })
      .in('id', taskIds)
      .eq('scheduled_date', fromDateIso)
      .in('status', ['pending', 'in_progress']);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    revalidatePath('/th/secretary');
    revalidatePath('/en/secretary');
    return { success: true, deferred: taskIds.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function completeSecretaryTasks(
  taskIds: string[],
): Promise<{ success: boolean; tasks?: SecretaryTask[]; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const uniqueIds = [...new Set(taskIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { success: true, tasks: [] };
  }

  const now = new Date().toISOString();
  const completedTasks: SecretaryTask[] = [];

  try {
    for (const taskId of uniqueIds) {
      const { data: taskRow, error: fetchError } = await getSupabaseAdmin()
        .from('operational_tasks')
        .select(TASK_SELECT)
        .eq('id', taskId)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase Error:', fetchError.message, fetchError.details);
        return { success: false, error: fetchError.message };
      }

      if (!taskRow) continue;

      const task = mapRow(taskRow as Record<string, unknown>);
      if (task.status === 'done' || task.status === 'skipped') {
        completedTasks.push(task);
        continue;
      }

      const { data, error } = await getSupabaseAdmin()
        .from('operational_tasks')
        .update({
          status: 'done',
          completed_at: now,
          active_session_started_at: null,
          updated_at: now,
        })
        .eq('id', taskId)
        .select(TASK_SELECT)
        .single();

      if (error) {
        console.error('Supabase Error:', error.message, error.details);
        return { success: false, error: error.message };
      }

      completedTasks.push(mapRow(data as Record<string, unknown>));
    }

    revalidatePath('/th/secretary');
    revalidatePath('/en/secretary');
    return { success: true, tasks: completedTasks };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function syncAndFetchSecretaryBoard(opts?: {
  dateIso?: string;
  locale?: string;
  plan?: SecretaryBoardSyncPlan;
}): Promise<{
  success: boolean;
  tasks?: SecretaryTask[];
  snapshot?: SecretarySnapshot;
  error?: string;
}> {
  const authError = await requireReadAccess();
  if (authError) return { success: false, error: authError };

  const plan = opts?.plan ?? { kind: 'full' as const, scopes: [] };
  const locale = opts?.locale ?? 'th';
  const dateIso = opts?.dateIso ?? todayIsoBkk();

  try {
    if (plan.kind === 'light' || plan.kind === 'scoped') {
      const tasksResult = await fetchSecretaryTasks(dateIso);

      if (!tasksResult.success || !tasksResult.tasks) {
        return { success: false, error: tasksResult.error ?? 'Failed to load tasks' };
      }

      return {
        success: true,
        tasks: tasksResult.tasks,
      };
    }

    const [tasksBeforeRetire, retireResult] = await Promise.all([
      fetchSecretaryTasks(dateIso),
      retirePendingDerivedSecretaryTasks(dateIso),
    ]);

    if (!retireResult.success) {
      return { success: false, error: retireResult.error };
    }

    const tasksResult =
      (retireResult.retired ?? 0) > 0 ? await fetchSecretaryTasks(dateIso) : tasksBeforeRetire;

    if (!tasksResult.success || !tasksResult.tasks) {
      return { success: false, error: tasksResult.error ?? 'Failed to load tasks' };
    }

    return {
      success: true,
      tasks: tasksResult.tasks,
      snapshot: buildMinimalSecretaryBoardSnapshot(dateIso, locale),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function updateSecretaryTaskStatus(
  taskId: string,
  status: SecretaryTaskStatus,
): Promise<{ success: boolean; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  try {
    const { data: existingRow, error: fetchError } = await getSupabaseAdmin()
      .from('operational_tasks')
      .select(TASK_SELECT)
      .eq('id', taskId)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase Error:', fetchError.message, fetchError.details);
      return { success: false, error: fetchError.message };
    }

    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'done' || status === 'skipped') {
      patch.completed_at = new Date().toISOString();
    } else {
      patch.completed_at = null;
      patch.completed_by = null;
    }

    const { error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .update(patch)
      .eq('id', taskId);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    revalidatePath('/th/secretary');
    revalidatePath('/en/secretary');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function deleteManualSecretaryTask(
  taskId: string,
): Promise<{ success: boolean; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  try {
    const { error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .delete()
      .eq('id', taskId)
      .eq('source_kind', 'manual');

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    revalidatePath('/th/secretary');
    revalidatePath('/en/secretary');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export type SecretaryBoard = {
  snapshot: SecretarySnapshot;
  tasks: SecretaryTask[];
};

export async function loadSecretaryBoard(opts?: {
  dateIso?: string;
  locale?: string;
}): Promise<{ success: boolean; board?: SecretaryBoard; error?: string }> {
  const authError = await requireReadAccess();
  if (authError) return { success: false, error: authError };

  const locale = opts?.locale ?? 'th';
  const dateIso = opts?.dateIso ?? todayIsoBkk();

  try {
    const [tasksResult, retireResult] = await Promise.all([
      fetchSecretaryTasks(dateIso),
      retirePendingDerivedSecretaryTasks(dateIso),
    ]);

    if (!retireResult.success) {
      return { success: false, error: retireResult.error };
    }

    if (!tasksResult.success || !tasksResult.tasks) {
      return { success: false, error: tasksResult.error ?? 'Failed to load tasks' };
    }

    let tasks = tasksResult.tasks;
    if ((retireResult.retired ?? 0) > 0) {
      const refetch = await fetchSecretaryTasks(dateIso);
      if (!refetch.success || !refetch.tasks) {
        return { success: false, error: refetch.error ?? 'Failed to load tasks' };
      }
      tasks = refetch.tasks;
    }

    return {
      success: true,
      board: {
        snapshot: buildMinimalSecretaryBoardSnapshot(dateIso, locale),
        tasks,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
