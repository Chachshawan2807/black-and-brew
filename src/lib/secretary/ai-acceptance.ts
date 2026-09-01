import type { SecretaryTask } from '@/lib/secretary/types';

export type AiSuggestionAcceptance = 'accepted' | 'rejected';

export function buildAiAcceptanceMetadata(
  task: SecretaryTask,
  outcome: AiSuggestionAcceptance,
): Record<string, unknown> {
  const prior = task.metadata ?? {};
  const priorAccepted = typeof prior.aiAcceptedCount === 'number' ? prior.aiAcceptedCount : 0;
  const priorRejected = typeof prior.aiRejectedCount === 'number' ? prior.aiRejectedCount : 0;

  return {
    ...prior,
    aiSuggested: true,
    aiAcceptance: outcome,
    aiAcceptedCount: outcome === 'accepted' ? priorAccepted + 1 : priorAccepted,
    aiRejectedCount: outcome === 'rejected' ? priorRejected + 1 : priorRejected,
    aiResolvedAt: new Date().toISOString(),
  };
}

export function shouldRecordAiAcceptance(task: SecretaryTask): boolean {
  return task.source_kind === 'ai_suggested';
}
