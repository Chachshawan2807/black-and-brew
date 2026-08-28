import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { generateSecretaryGuidance } from '@/lib/secretary/generate-guidance';
import { requirePrivilegedSession } from '@/lib/policies/server-gate';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export const maxDuration = 30;

const bodySchema = z.object({
  tasks: z.array(z.custom<SecretaryTask>()),
  snapshot: z.custom<SecretarySnapshot>(),
  fingerprint: z.string().min(8).max(64).optional(),
});

export async function POST(request: Request) {
  await headers();
  noStore();

  const session = await requirePrivilegedSession();
  if (!session.ok) {
    return NextResponse.json({ success: false, error: session.error }, { status: 403 });
  }

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const { tasks, snapshot } = parsed.data;
    const result = await generateSecretaryGuidance({ tasks, snapshot });

    return NextResponse.json({
      success: true,
      text: result.text,
      fingerprint: result.fingerprint,
      source: result.source,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[secretary/guidance]', message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
