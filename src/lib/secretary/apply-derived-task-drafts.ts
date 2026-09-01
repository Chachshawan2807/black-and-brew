import {
  BEAN_ORDERS_UNIFIED_TASK_TYPE,
  isBeanOrdersUnifiedTaskType,
  isLegacyBeanOrderTaskType,
  LEGACY_BEAN_ORDER_TASK_TYPES,
} from '@/lib/secretary/bean-order-task-consolidation';
import { resolveDerivedTaskUpsert, resolveStaleDerivedHashes } from '@/lib/secretary/derive-tasks';
import {
  isRowEligibleForStaleSkip,
  skipStaleSecretaryTaskIds,
} from '@/lib/secretary/retire-stale-tasks';
import type { DerivedTaskDraft, SecretaryModule } from '@/lib/secretary/types';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const DERIVED_TASK_LOOKUP_SELECT = 'id, status, scheduled_date, metadata, task_type';

async function findExistingDerivedTaskRow(
  draft: DerivedTaskDraft,
  dateIso: string,
): Promise<Record<string, unknown> | null> {
  const admin = getSupabaseAdmin();

  const { data: existingByHash } = await admin
    .from('operational_tasks')
    .select(DERIVED_TASK_LOOKUP_SELECT)
    .eq('source_ref_hash', draft.sourceRefHash)
    .maybeSingle();

  if (existingByHash) return existingByHash as Record<string, unknown>;

  const { data: existingByType } = await admin
    .from('operational_tasks')
    .select(DERIVED_TASK_LOOKUP_SELECT)
    .eq('task_type', draft.taskType)
    .eq('scheduled_date', dateIso)
    .eq('source_kind', 'derived')
    .eq('module', draft.module)
    .maybeSingle();

  if (existingByType) return existingByType as Record<string, unknown>;

  if (!isBeanOrdersUnifiedTaskType(draft.taskType)) {
    return null;
  }

  for (const legacyType of LEGACY_BEAN_ORDER_TASK_TYPES) {
    const { data: legacyRow } = await admin
      .from('operational_tasks')
      .select(DERIVED_TASK_LOOKUP_SELECT)
      .eq('task_type', legacyType)
      .eq('scheduled_date', dateIso)
      .eq('source_kind', 'derived')
      .eq('module', draft.module)
      .maybeSingle();

    if (legacyRow) return legacyRow as Record<string, unknown>;
  }

  return null;
}

async function skipInactiveDerivedTaskIds(
  taskIds: string[],
  reason: 'legacy_bean_orders' | 'branch2_inactive' | 'stale_derived',
): Promise<number> {
  return skipStaleSecretaryTaskIds(taskIds, reason);
}

export async function applyDerivedTaskDrafts(
  drafts: DerivedTaskDraft[],
  dateIso: string,
  options?: { limitModules?: SecretaryModule[]; isBranch2Day?: boolean },
): Promise<{ success: boolean; upserted?: number; autoSkipped?: number; error?: string }> {
  const activeHashes = new Set(drafts.map((draft) => draft.sourceRefHash));
  const limitModules = options?.limitModules?.length ? new Set(options.limitModules) : null;

  let upserted = 0;
  for (const draft of drafts) {
    if (limitModules && !limitModules.has(draft.module)) {
      continue;
    }

    const existing = await findExistingDerivedTaskRow(draft, dateIso);

    const decision = resolveDerivedTaskUpsert(
      draft,
      dateIso,
      existing?.id
        ? {
            id: String(existing.id),
            status: String(existing.status),
            scheduled_date: String(existing.scheduled_date),
            metadata: (existing.metadata as Record<string, unknown> | null) ?? null,
          }
        : null,
    );

    if (decision.action === 'skip') {
      continue;
    }

    if (decision.action === 'insert') {
      const { error } = await getSupabaseAdmin().from('operational_tasks').insert(decision.row);
      if (error) {
        console.error('Supabase Error:', error.message, error.details);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await getSupabaseAdmin()
        .from('operational_tasks')
        .update({
          ...decision.patch,
          task_type: draft.taskType,
          title: draft.title,
          description: draft.description ?? null,
          action_href: draft.actionHref ?? null,
          source_ref_hash: draft.sourceRefHash,
          source_ref: draft.sourceRef,
        })
        .eq('id', decision.id);
      if (error) {
        console.error('Supabase Error:', error.message, error.details);
        return { success: false, error: error.message };
      }
    }
    upserted += 1;
  }

  let existingQuery = getSupabaseAdmin()
    .from('operational_tasks')
    .select('id, source_ref_hash, status, module, task_type, metadata')
    .eq('scheduled_date', dateIso)
    .eq('source_kind', 'derived')
    .in('status', ['pending', 'in_progress']);

  const { data: existingDerived, error: fetchError } = await existingQuery;

  if (fetchError) {
    console.error('Supabase Error:', fetchError.message, fetchError.details);
    return { success: false, error: fetchError.message };
  }

  const scopedRows = (existingDerived ?? []).filter((row) => {
    if (!limitModules) return true;
    return limitModules.has(String(row.module) as SecretaryModule);
  });

  const staleIds = resolveStaleDerivedHashes(
    activeHashes,
    scopedRows
      .map((row) => row.source_ref_hash)
      .filter((hash): hash is string => typeof hash === 'string'),
  );

  let autoSkipped = 0;
  if (staleIds.length > 0) {
    const staleTaskIds = scopedRows
      .filter(
        (row) =>
          row.source_ref_hash &&
          staleIds.includes(String(row.source_ref_hash)) &&
          isRowEligibleForStaleSkip({
            status: String(row.status),
            metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          }),
      )
      .map((row) => String(row.id));

    if (staleTaskIds.length > 0) {
      try {
        autoSkipped += await skipInactiveDerivedTaskIds(staleTaskIds, 'stale_derived');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  }

  const hasUnifiedBeanOrderDraft = drafts.some((draft) =>
    isBeanOrdersUnifiedTaskType(draft.taskType),
  );
  if (hasUnifiedBeanOrderDraft) {
    const unifiedTaskIds = new Set(
      scopedRows
        .filter((row) => String(row.task_type) === BEAN_ORDERS_UNIFIED_TASK_TYPE)
        .map((row) => String(row.id)),
    );
    const legacyBeanOrderTaskIds = scopedRows
      .filter(
        (row) =>
          row.module === 'bean_orders' &&
          isLegacyBeanOrderTaskType(String(row.task_type)) &&
          !unifiedTaskIds.has(String(row.id)) &&
          isRowEligibleForStaleSkip({
            status: String(row.status),
            metadata: (row.metadata as Record<string, unknown> | null) ?? null,
          }),
      )
      .map((row) => String(row.id));

    if (legacyBeanOrderTaskIds.length > 0) {
      try {
        autoSkipped += await skipInactiveDerivedTaskIds(
          legacyBeanOrderTaskIds,
          'legacy_bean_orders',
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  }

  if (options?.isBranch2Day === false) {
    try {
      autoSkipped += await skipInactiveBranch2DerivedTasks(dateIso);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  return { success: true, upserted, autoSkipped };
}

async function skipInactiveBranch2DerivedTasks(dateIso: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from('operational_tasks')
    .select('id, status, metadata')
    .eq('scheduled_date', dateIso)
    .eq('source_kind', 'derived')
    .eq('module', 'branch2')
    .in('status', ['pending', 'in_progress', 'done']);

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  const taskIds = (data ?? [])
    .filter((row) =>
      isRowEligibleForStaleSkip({
        status: String(row.status),
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      }),
    )
    .map((row) => String(row.id));

  return skipInactiveDerivedTaskIds(taskIds, 'branch2_inactive');
}
