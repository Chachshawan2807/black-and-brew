import { resolveDerivedTaskUpsert, resolveStaleDerivedHashes } from '@/lib/secretary/derive-tasks';
import type { AiSuggestedTaskDraft } from '@/lib/secretary/ai-suggestion-types';
import {
  isRowEligibleForStaleSkip,
  skipStaleSecretaryTaskIds,
} from '@/lib/secretary/retire-stale-tasks';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const AI_SUGGESTED_LOOKUP_SELECT = 'id, status, scheduled_date, metadata, task_type';

async function findExistingAiSuggestedRow(
  draft: AiSuggestedTaskDraft,
  dateIso: string,
): Promise<Record<string, unknown> | null> {
  const admin = getSupabaseAdmin();

  const { data: existingByHash } = await admin
    .from('operational_tasks')
    .select(AI_SUGGESTED_LOOKUP_SELECT)
    .eq('source_ref_hash', draft.sourceRefHash)
    .maybeSingle();

  if (existingByHash) return existingByHash as Record<string, unknown>;

  const { data: existingByKey } = await admin
    .from('operational_tasks')
    .select(AI_SUGGESTED_LOOKUP_SELECT)
    .eq('scheduled_date', dateIso)
    .eq('source_kind', 'ai_suggested')
    .contains('source_ref', { suggestionKey: draft.sourceRef.suggestionKey })
    .maybeSingle();

  return (existingByKey as Record<string, unknown> | null) ?? null;
}

function draftToInsertRow(draft: AiSuggestedTaskDraft, dateIso: string): Record<string, unknown> {
  return {
    task_type: draft.taskType,
    title: draft.title,
    description: draft.description ?? draft.metadata.rationale,
    priority: draft.priority,
    status: 'pending',
    module: draft.module,
    scheduled_date: dateIso,
    source_kind: 'ai_suggested',
    source_ref: draft.sourceRef,
    source_ref_hash: draft.sourceRefHash,
    action_href: draft.actionHref ?? null,
    metadata: {
      ...draft.metadata,
      estimatedMinutes: draft.estimatedMinutes ?? null,
    },
    updated_at: new Date().toISOString(),
  };
}

export async function applyAiSuggestedDrafts(
  drafts: AiSuggestedTaskDraft[],
  dateIso: string,
): Promise<{ success: boolean; upserted?: number; autoSkipped?: number; error?: string }> {
  const activeHashes = new Set(drafts.map((draft) => draft.sourceRefHash));
  let upserted = 0;

  for (const draft of drafts) {
    const existing = await findExistingAiSuggestedRow(draft, dateIso);
    const row = draftToInsertRow(draft, dateIso);

    const decision = resolveDerivedTaskUpsert(
      {
        taskType: draft.taskType,
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        module: draft.module,
        sourceRef: draft.sourceRef,
        sourceRefHash: draft.sourceRefHash,
        actionHref: draft.actionHref,
        estimatedMinutes: draft.estimatedMinutes,
        metadata: draft.metadata,
      },
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
      const { error } = await getSupabaseAdmin()
        .from('operational_tasks')
        .insert({ ...decision.row, source_kind: 'ai_suggested' });
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
          description: draft.description ?? draft.metadata.rationale,
          action_href: draft.actionHref ?? null,
          source_ref_hash: draft.sourceRefHash,
          source_ref: draft.sourceRef,
          source_kind: 'ai_suggested',
          metadata: {
            ...draft.metadata,
            estimatedMinutes: draft.estimatedMinutes ?? null,
          },
        })
        .eq('id', decision.id);
      if (error) {
        console.error('Supabase Error:', error.message, error.details);
        return { success: false, error: error.message };
      }
    }

    upserted += 1;
  }

  const { data: existingAiSuggested, error: fetchError } = await getSupabaseAdmin()
    .from('operational_tasks')
    .select('id, source_ref_hash, status, metadata')
    .eq('scheduled_date', dateIso)
    .eq('source_kind', 'ai_suggested')
    .in('status', ['pending', 'in_progress', 'done']);

  if (fetchError) {
    console.error('Supabase Error:', fetchError.message, fetchError.details);
    return { success: false, error: fetchError.message };
  }

  const staleIds = resolveStaleDerivedHashes(
    activeHashes,
    (existingAiSuggested ?? [])
      .map((row) => row.source_ref_hash)
      .filter((hash): hash is string => typeof hash === 'string'),
  );

  let autoSkipped = 0;
  if (staleIds.length > 0) {
    const staleTaskIds = (existingAiSuggested ?? [])
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
        autoSkipped += await skipStaleSecretaryTaskIds(staleTaskIds, 'stale_ai');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  }

  return { success: true, upserted, autoSkipped };
}
