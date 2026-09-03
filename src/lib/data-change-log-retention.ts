import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

export const DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS = 90;
export const DEFAULT_PURGE_BATCH_SIZE = 1000;
export const DEFAULT_MAX_PURGE_BATCHES = 50;

export const BEAN_ORDER_NOTIFICATION_ENTITY_TYPES = [
  'bean_order_created',
  'bean_order_delivery',
  'bean_order_shipment',
  'bean_order_payment',
] as const;

const DEDUP_PROTECTION_WINDOWS_MS = {
  insights: 7 * 24 * 60 * 60 * 1000,
  scheduleDailyReport: 3 * 24 * 60 * 60 * 1000,
  beanOrdersNotification: 30 * 24 * 60 * 60 * 1000,
  security: 2 * 24 * 60 * 60 * 1000,
  secretaryDigest: 7 * 24 * 60 * 60 * 1000,
} as const;

export interface DataChangeLogRetentionRow {
  module: string;
  entity_type: string;
  occurred_at: string | Date;
}

export function resolveRetentionCutoffIso(
  retentionDays: number,
  now: Date = new Date(),
): string {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff.toISOString();
}

function occurredAtMs(occurredAt: string | Date): number {
  return occurredAt instanceof Date ? occurredAt.getTime() : new Date(occurredAt).getTime();
}

function isWithinWindow(occurredAt: string | Date, windowMs: number, now: Date): boolean {
  return now.getTime() - occurredAtMs(occurredAt) <= windowMs;
}

/** Rows kept during active dedup windows even when a shorter retention is configured. */
export function isDedupProtectedDataChangeLog(
  row: DataChangeLogRetentionRow,
  now: Date = new Date(),
): boolean {
  if (row.module === 'insights') {
    return isWithinWindow(row.occurred_at, DEDUP_PROTECTION_WINDOWS_MS.insights, now);
  }

  if (row.module === 'schedule' && row.entity_type === 'daily_report') {
    return isWithinWindow(row.occurred_at, DEDUP_PROTECTION_WINDOWS_MS.scheduleDailyReport, now);
  }

  if (
    row.module === 'bean_orders' &&
    (BEAN_ORDER_NOTIFICATION_ENTITY_TYPES as readonly string[]).includes(row.entity_type)
  ) {
    return isWithinWindow(
      row.occurred_at,
      DEDUP_PROTECTION_WINDOWS_MS.beanOrdersNotification,
      now,
    );
  }

  if (row.module === 'security') {
    return isWithinWindow(row.occurred_at, DEDUP_PROTECTION_WINDOWS_MS.security, now);
  }

  if (row.module === 'secretary' && row.entity_type === 'secretary_digest') {
    return isWithinWindow(row.occurred_at, DEDUP_PROTECTION_WINDOWS_MS.secretaryDigest, now);
  }

  return false;
}

export interface PurgeDataChangeLogsOptions {
  retentionDays?: number;
  batchSize?: number;
  maxBatches?: number;
}

export interface PurgeDataChangeLogsResult {
  deleted: number;
  batches: number;
  retentionDays: number;
  batchSize: number;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(supabaseUrl, requireServiceRoleKey());
}

export async function purgeDataChangeLogs(
  options: PurgeDataChangeLogsOptions = {},
): Promise<PurgeDataChangeLogsResult> {
  const retentionDays = options.retentionDays ?? DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS;
  const batchSize = options.batchSize ?? DEFAULT_PURGE_BATCH_SIZE;
  const maxBatches = options.maxBatches ?? DEFAULT_MAX_PURGE_BATCHES;

  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive number');
  }
  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a positive number');
  }
  if (!Number.isFinite(maxBatches) || maxBatches < 1) {
    throw new Error('maxBatches must be a positive number');
  }

  const supabase = getSupabaseAdmin();
  let deleted = 0;
  let batches = 0;

  while (batches < maxBatches) {
    const { data, error } = await supabase.rpc('purge_data_change_logs_batch', {
      p_retention_days: retentionDays,
      p_batch_size: batchSize,
    });

    if (error) {
      if (error.message?.includes('Could not find the function') || error.code === 'PGRST202') {
        throw new Error('purge_data_change_logs_batch is not installed. Apply latest migrations.');
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    const batchDeleted = typeof data === 'number' ? data : Number(data ?? 0);
    deleted += batchDeleted;
    batches += 1;

    if (batchDeleted < batchSize) {
      break;
    }
  }

  return { deleted, batches, retentionDays, batchSize };
}
