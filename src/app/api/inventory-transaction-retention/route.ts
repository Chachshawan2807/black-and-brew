import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import {
  DEFAULT_INVENTORY_TRANSACTION_RETENTION_MONTHS,
  DEFAULT_MAX_PURGE_BATCHES,
  DEFAULT_PURGE_BATCH_SIZE,
  purgeInventoryTransactions,
} from '@/lib/inventory-transaction-retention';
import { denyUnlessBearerSecret } from '@/lib/security/route-auth';
import { toPublicErrorMessage } from '@/lib/security/public-error';

export const maxDuration = 60;

const POSITIVE_INT_FIELD_LABEL: Record<string, string> = {
  retentionMonths: 'จำนวนเดือนเก็บข้อมูล',
  batchSize: 'ขนาดชุดลบ',
  maxBatches: 'จำนวนรอบลบสูงสุด',
};

function parsePositiveInt(
  value: string | null,
  fallback: number,
  fieldName: string,
): number | { error: string } {
  if (value == null || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    const label = POSITIVE_INT_FIELD_LABEL[fieldName] ?? fieldName;
    return { error: `${label} ต้องเป็นจำนวนเต็มบวก` };
  }
  return parsed;
}

export async function GET(request: Request) {
  await headers();
  noStore();

  try {
    const denied = denyUnlessBearerSecret(request, process.env.CRON_SECRET, {
      logPrefix: '[CRON]',
      secretName: 'CRON_SECRET',
    });
    if (denied) return denied;

    const params = new URL(request.url).searchParams;
    const retentionMonths = parsePositiveInt(
      params.get('retentionMonths'),
      DEFAULT_INVENTORY_TRANSACTION_RETENTION_MONTHS,
      'retentionMonths',
    );
    if (typeof retentionMonths !== 'number') {
      return NextResponse.json({ success: false, error: retentionMonths.error }, { status: 400 });
    }

    const batchSize = parsePositiveInt(
      params.get('batchSize'),
      DEFAULT_PURGE_BATCH_SIZE,
      'batchSize',
    );
    if (typeof batchSize !== 'number') {
      return NextResponse.json({ success: false, error: batchSize.error }, { status: 400 });
    }

    const maxBatches = parsePositiveInt(
      params.get('maxBatches'),
      DEFAULT_MAX_PURGE_BATCHES,
      'maxBatches',
    );
    if (typeof maxBatches !== 'number') {
      return NextResponse.json({ success: false, error: maxBatches.error }, { status: 400 });
    }

    const result = await purgeInventoryTransactions({ retentionMonths, batchSize, maxBatches });

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[CRON] inventory-transaction-retention failed:', error);
    return NextResponse.json(
      { success: false, error: toPublicErrorMessage(error) },
      { status: 500 },
    );
  }
}
