import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { refreshDerivedSecretaryTasks } from '@/app/actions/secretary-actions';
import { requirePrivilegedSession } from '@/lib/policies/server-gate';

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

    const result = await refreshDerivedSecretaryTasks(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[secretary/refresh]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
