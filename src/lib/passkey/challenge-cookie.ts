import { cookies } from 'next/headers';
import { getCookieOpts } from '@/lib/auth-cookies';

const CHALLENGE_COOKIE = 'bb_passkey_challenge';
const CHALLENGE_TTL_SEC = 5 * 60;

export type PasskeyChallengeKind = 'registration' | 'authentication';

export async function storePasskeyChallenge(
  challenge: string,
  kind: PasskeyChallengeKind
): Promise<void> {
  const cookieStore = await cookies();
  const payload = JSON.stringify({ challenge, kind });
  cookieStore.set(CHALLENGE_COOKIE, payload, {
    ...getCookieOpts(),
    maxAge: CHALLENGE_TTL_SEC,
  });
}

export async function consumePasskeyChallenge(
  expectedKind: PasskeyChallengeKind
): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CHALLENGE_COOKIE)?.value;
  cookieStore.delete(CHALLENGE_COOKIE);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { challenge?: string; kind?: PasskeyChallengeKind };
    if (parsed.kind !== expectedKind || !parsed.challenge) {
      return null;
    }
    return parsed.challenge;
  } catch {
    return null;
  }
}
