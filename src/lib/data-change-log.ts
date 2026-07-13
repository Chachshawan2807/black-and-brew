import type { Json } from '@/lib/database.types';
import { parseUserAgent } from '@/lib/parse-user-agent';

export type DataChangeAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BULK_UPDATE'
  | 'BULK_DELETE';

export type DataChangeModule =
  | 'inventory'
  | 'schedule'
  | 'sales'
  | 'maintenance'
  | 'holiday'
  | 'dashboard'
  | 'settings';

export type DataChangeSource = 'web' | 'server_action' | 'api' | 'system';

export type ActorAccessLevel = 'full' | 'read_only' | 'system';

export interface FieldChange {
  field: string;
  old_value: Json;
  new_value: Json;
}

export interface DataChangeLogInput {
  action: DataChangeAction;
  module: DataChangeModule;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  fieldChanges?: FieldChange[];
  oldValue?: Json | null;
  newValue?: Json | null;
  source?: DataChangeSource;
  status?: 'success' | 'failed';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ResolvedActor {
  actorId: string | null;
  actorLabel: string;
  actorAccessLevel: ActorAccessLevel;
}

const SENSITIVE_FIELDS = new Set(['password', 'pin', 'token', 'secret', 'api_key']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeJsonValue(value: unknown): Json {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonValue(entry)) as Json;
  }
  if (isPlainObject(value)) {
    const result: Record<string, Json> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeJsonValue(entry);
      }
    }
    return result;
  }
  return String(value);
}

export function computeFieldChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields?: string[]
): FieldChange[] {
  const keys = fields ?? Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  const changes: FieldChange[] = [];

  for (const field of keys) {
    if (SENSITIVE_FIELDS.has(field.toLowerCase())) continue;

    const oldRaw = before?.[field] ?? null;
    const newRaw = after?.[field] ?? null;
    const oldValue = sanitizeJsonValue(oldRaw);
    const newValue = sanitizeJsonValue(newRaw);

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, old_value: oldValue, new_value: newValue });
    }
  }

  return changes;
}

export function formatActorOsName(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  return parseUserAgent(userAgent).osName;
}

const LEGACY_FULL_ACCESS_LABEL = 'ผู้ใช้งาน (สิทธิ์แก้ไข)';

function isFullAccessActor(
  actorLabel: string,
  actorAccessLevel: ActorAccessLevel | null | undefined,
): boolean {
  return (
    actorAccessLevel === 'full' ||
    actorLabel === LEGACY_FULL_ACCESS_LABEL ||
    actorLabel === 'ผู้ใช้งาน' ||
    actorLabel.startsWith('ผู้แก้ไข')
  );
}

function formatEditorActorLabel(userAgent: string | null | undefined): string {
  const osName = formatActorOsName(userAgent);
  return osName ? `ผู้แก้ไข (${osName})` : 'ผู้แก้ไข';
}

export function resolveActorLabel(
  accessLevel: ActorAccessLevel,
  email?: string | null,
  userAgent?: string | null,
): string {
  if (email) return email;
  if (accessLevel === 'full') return formatEditorActorLabel(userAgent);
  if (accessLevel === 'read_only') return 'ผู้ใช้งาน (อ่านอย่างเดียว)';
  return 'ระบบ';
}

/** Display label for notifications and history — supports legacy stored actor_label values. */
export function formatNotificationActorLabel(
  actorLabel: string,
  actorAccessLevel: ActorAccessLevel | null | undefined,
  userAgent?: string | null,
): string {
  if (actorLabel.includes('@')) return actorLabel;
  if (actorAccessLevel === 'read_only' || actorLabel.includes('อ่านอย่างเดียว')) {
    return actorLabel;
  }
  if (actorAccessLevel === 'system' || actorLabel === 'ระบบ') return actorLabel;
  if (isFullAccessActor(actorLabel, actorAccessLevel)) {
    return formatEditorActorLabel(userAgent);
  }
  return actorLabel;
}
