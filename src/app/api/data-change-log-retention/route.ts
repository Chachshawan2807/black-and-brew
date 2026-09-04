import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import {
  DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS,
  DEFAULT_MAX_PURGE_BATCHES,
  DEFAULT_PURGE_BATCH_SIZE,
  purgeDataChangeLogs,
} from '@/lib/data-change-log-retention';
import { denyUnlessBearerSecret } from '@/lib/security/route-auth';
import { toPublicErrorMessage } from '@/lib/security/public-error';

export const maxDuration = 60;

function parsePositiveInt(
  value: string | null,
  fallback: number,
  fieldName: string,
): number | { error: string } {
  if (value == null || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { error: `${fieldName} must be a positive integer` };
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
    const retentionDays = parsePositiveInt(
      params.get('retentionDays'),
      DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS,
      'retentionDays',
    );
    if (typeof retentionDays !== 'number') {
      return NextResponse.json({ success: false, error: retentionDays.error }, { status: 400 });
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

    const result = await purgeDataChangeLogs({ retentionDays, batchSize, maxBatches });

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[CRON] data-change-log-retention failed:', message);
    return NextResponse.json(
      { success: false, error: toPublicErrorMessage(error) },
      { status: 500 },
    );
  }
}
