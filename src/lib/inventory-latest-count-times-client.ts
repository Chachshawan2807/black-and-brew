import {
  buildLatestCountedAtByItemId,
  LATEST_COUNT_PAGE_SIZE,
  LATEST_COUNT_SCAN_MAX_ROWS,
  shouldContinueLatestCountScan,
} from '@/lib/inventory-count-today';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { supabase } from '@/lib/supabase';

let inflightLatestCountTimes: Promise<Record<string, string>> | null = null;

async function loadLatestInventoryCountTimesByItemId(): Promise<Record<string, string>> {
  const sessionOk = await ensureSupabaseSession();
  if (!sessionOk) {
    console.error('[loadLatestInventoryCountTimesByItemId] Supabase session unavailable');
    return {};
  }

  const byItemId: Record<string, string> = {};
  const pageSize = LATEST_COUNT_PAGE_SIZE;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('inventory_count_verifications')
      .select('inventory_item_id, counted_at')
      .order('counted_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error(
        'Supabase Error:',
        error.message,
        error.details ?? '',
      );
      break;
    }

    const page = data ?? [];
    const pageLatest = buildLatestCountedAtByItemId(page);
    for (const [itemId, countedAt] of Object.entries(pageLatest)) {
      if (!byItemId[itemId]) byItemId[itemId] = countedAt;
    }

    offset += page.length;
    if (
      !shouldContinueLatestCountScan({
        pageLength: page.length,
        pageSize,
        rowsScanned: offset,
        maxRows: LATEST_COUNT_SCAN_MAX_ROWS,
        seenItemIds: Object.keys(byItemId),
      })
    ) {
      break;
    }
  }

  return byItemId;
}

/** Latest counted_at per inventory item (client read via RLS). */
export function fetchLatestInventoryCountTimesClient(): Promise<Record<string, string>> {
  if (!inflightLatestCountTimes) {
    inflightLatestCountTimes = loadLatestInventoryCountTimesByItemId().finally(() => {
      inflightLatestCountTimes = null;
    });
  }
  return inflightLatestCountTimes;
}

/** @internal Vitest-only reset for in-flight dedupe. */
export function resetLatestInventoryCountTimesClientForTests(): void {
  if (process.env.VITEST !== 'true') {
    throw new Error('resetLatestInventoryCountTimesClientForTests is only available under Vitest');
  }
  inflightLatestCountTimes = null;
}
