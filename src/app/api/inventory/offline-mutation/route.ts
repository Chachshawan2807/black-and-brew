import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { replayOfflineMutation } from '@/lib/offline-mutation-sync';
import type { OfflineMutation } from '@/lib/offline-mutation-types';
import { OFFLINE_AUTH_SESSION_COOKIE, READ_ONLY_DENY_MSG } from '@/lib/auth-constants';
import { offlineMutationAuthSessionError } from '@/lib/offline-auth-session';
import { requireMutationAccess } from '@/lib/policies/server-gate';

export const maxDuration = 30;

const fieldMutationSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  kind: z.literal('inventory_field'),
  itemId: z.string(),
  field: z.string(),
  value: z.union([z.string(), z.number()]),
  clientSessionId: z.string().optional(),
  authSessionId: z.string().optional(),
});

const stockMutationSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  kind: z.literal('inventory_stock'),
  itemId: z.string(),
  stock: z.number(),
  note: z.string(),
  clientSessionId: z.string().optional(),
  authSessionId: z.string().optional(),
  notificationSource: z.string().optional(),
});

const reorderMutationSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  kind: z.literal('inventory_reorder'),
  sortOrders: z.array(
    z.object({
      id: z.string(),
      sort_order: z.number(),
    }),
  ),
  clientSessionId: z.string().optional(),
  authSessionId: z.string().optional(),
});

const mutationSchema = z.discriminatedUnion('kind', [
  fieldMutationSchema,
  stockMutationSchema,
  reorderMutationSchema,
]);

/** Replays one queued offline inventory mutation (used by Background Sync in the service worker). */
export async function POST(request: Request) {
  await headers();
  noStore();

  const authError = await requireMutationAccess();
  if (authError) {
    const status = authError === READ_ONLY_DENY_MSG ? 403 : 401;
    return NextResponse.json({ success: false, error: authError, retryable: false }, { status });
  }

  try {
    const body = await request.json();
    const parsed = mutationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid mutation payload' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const offlineAuthSessionId = cookieStore.get(OFFLINE_AUTH_SESSION_COOKIE)?.value;
    const sessionError = offlineMutationAuthSessionError(parsed.data, offlineAuthSessionId);
    if (sessionError) {
      return NextResponse.json(
        { success: false, error: sessionError, retryable: false },
        { status: 403 },
      );
    }

    const result = await replayOfflineMutation(parsed.data as OfflineMutation);
    if (!result.success) {
      return NextResponse.json(result, { status: result.retryable ? 503 : 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[offline-mutation] replay failed:', message);
    return NextResponse.json({ success: false, error: message, retryable: true }, { status: 503 });
  }
}
