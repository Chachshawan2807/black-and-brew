import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { retireDerivedSecretaryTasksForDay } from '@/app/actions/home-actions';
import { requirePrivilegedSession } from '@/lib/policies/server-gate';
import { toPublicErrorMessage } from '@/lib/security/public-error';

/** Retires pending derived operational_tasks for the secretary board (no derive rebuild). */
export async function POST(request: Request) {
  await headers();
  noStore();

  const session = await requirePrivilegedSession();
  if (!session.ok) {
    return NextResponse.json({ success: false, error: session.error }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      dateIso?: string;
      locale?: string;
    };

    const result = await retireDerivedSecretaryTasksForDay(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[home/refresh]', message);
    return NextResponse.json(
      { success: false, error: toPublicErrorMessage(error) },
      { status: 500 },
    );
  }
}
