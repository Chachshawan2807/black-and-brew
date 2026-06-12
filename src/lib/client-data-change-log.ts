import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { getClientSessionId } from '@/lib/client-session';
import {
  computeFieldChanges,
  sanitizeJsonValue,
  type DataChangeAction,
  type DataChangeModule,
} from '@/lib/data-change-log';

/** Fire-and-forget audit log from client components after a successful mutation. */
export function logClientDataChange(input: {
  action: DataChangeAction;
  module: DataChangeModule;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  fields?: string[];
  metadata?: Record<string, unknown>;
}): void {
  const fieldChanges =
    input.before || input.after
      ? computeFieldChanges(input.before, input.after, input.fields)
      : [];

  void recordDataChange({
    action: input.action,
    module: input.module,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    fieldChanges,
    oldValue: input.before != null ? sanitizeJsonValue(input.before) : null,
    newValue: input.after != null ? sanitizeJsonValue(input.after) : null,
    source: 'web',
    metadata: {
      ...input.metadata,
      clientSessionId: getClientSessionId(),
    },
  });
}
