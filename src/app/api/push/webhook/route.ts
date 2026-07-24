import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { dispatchInventoryWebPush, rowToDataChangeLogRow } from '@/lib/web-push';
import { denyUnlessBearerSecret } from '@/lib/security/route-auth';

export const maxDuration = 30;

/** Optional Supabase Database Webhook target for inventory push (backup to recordDataChange hook). */
export async function POST(request: Request) {
  await headers();
  noStore();

  const denied = denyUnlessBearerSecret(request, process.env.PUSH_WEBHOOK_SECRET, {
    logPrefix: '[push/webhook]',
    secretName: 'PUSH_WEBHOOK_SECRET',
  });
  if (denied) return denied;

  try {
    const body = (await request.json()) as { record?: Record<string, unknown>; type?: string };
    if (body.type && body.type !== 'INSERT') {
      return NextResponse.json({ success: true, skipped: true });
    }

    const record = body.record;
    if (!record || record.module !== 'inventory' || record.status !== 'success') {
      return NextResponse.json({ success: true, skipped: true });
    }

    const result = await dispatchInventoryWebPush(rowToDataChangeLogRow(record));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[push/webhook] failed:', error);
    return NextResponse.json({ success: false, error: 'Push dispatch failed' }, { status: 500 });
  }
}
