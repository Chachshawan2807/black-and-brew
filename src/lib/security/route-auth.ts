import { NextResponse } from 'next/server';
import { verifyBearerSecret } from '@/lib/security/bearer-auth';

type BearerAuthOptions = {
  /** Log prefix for unauthorized attempts, e.g. "[CRON]" */
  logPrefix?: string;
  /** Label used in missing-config error logs */
  secretName?: string;
};

/**
 * Validates `Authorization: Bearer <secret>` against an env var.
 * Returns a 401/500 NextResponse when denied, or null when authorized.
 */
export function denyUnlessBearerSecret(
  request: Request,
  secret: string | undefined | null,
  options: BearerAuthOptions = {},
): NextResponse | null {
  const { logPrefix = '[AUTH]', secretName = 'SECRET' } = options;

  if (!secret?.trim()) {
    console.error(`${logPrefix} Missing ${secretName} in environment`);
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!verifyBearerSecret(authHeader, secret.trim())) {
    console.error(`${logPrefix} Unauthorized access attempt`);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
