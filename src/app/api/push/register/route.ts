import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { registerPushSubscription } from '@/app/actions/push-actions';

export const maxDuration = 30;

/**
 * Stable HTTP fallback for Web Push registration.
 * Installed PWAs can keep a hashed Server Action ID from a previous deploy
 * ("Failed to find Server Action") while PIN cookies still work. This route
 * does not depend on those IDs.
 */
export async function POST(request: Request) {
  await headers();
  noStore();

  try {
    const body = (await request.json()) as Parameters<typeof registerPushSubscription>[0];
    const result = await registerPushSubscription(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/push/register]', error);
    return NextResponse.json({ success: false, error: 'server_exception' }, { status: 500 });
  }
}
