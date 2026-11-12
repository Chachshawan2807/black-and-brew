import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

export const DEFAULT_INVENTORY_TRANSACTION_RETENTION_MONTHS = 6;
export const DEFAULT_PURGE_BATCH_SIZE = 500;
export const DEFAULT_MAX_PURGE_BATCHES = 200;

export interface PurgeInventoryTransactionsOptions {
  retentionMonths?: number;
  batchSize?: number;
  maxBatches?: number;
}

export interface PurgeInventoryTransactionsResult {
  deleted: number;
  batches: number;
  retentionMonths: number;
  batchSize: number;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  return createClient(supabaseUrl, requireServiceRoleKey());
}

export async function purgeInventoryTransactions(
  options: PurgeInventoryTransactionsOptions = {},
): Promise<PurgeInventoryTransactionsResult> {
  const retentionMonths =
    options.retentionMonths ?? DEFAULT_INVENTORY_TRANSACTION_RETENTION_MONTHS;
  const batchSize = options.batchSize ?? DEFAULT_PURGE_BATCH_SIZE;
  const maxBatches = options.maxBatches ?? DEFAULT_MAX_PURGE_BATCHES;

  if (!Number.isFinite(retentionMonths) || retentionMonths < 1) {
    throw new Error('retentionMonths must be a positive number');
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
    const { data, error } = await supabase.rpc('purge_inventory_transactions_batch', {
      p_retention_months: retentionMonths,
      p_batch_size: batchSize,
    });

    if (error) {
      if (error.message?.includes('Could not find the function') || error.code === 'PGRST202') {
        throw new Error(
          'purge_inventory_transactions_batch is not installed. Apply latest migrations.',
        );
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

  return { deleted, batches, retentionMonths, batchSize };
}
