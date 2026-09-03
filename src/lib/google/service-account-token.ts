import { createSign } from 'node:crypto';
import type { GoogleServiceAccount } from '@/lib/google/service-account-config';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildServiceAccountJwt(account: GoogleServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: account.client_email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key);
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export function clearGoogleServiceAccountAccessTokenCache(): void {
  cachedAccessToken = null;
}

export async function getGoogleServiceAccountAccessToken(
  account: GoogleServiceAccount,
): Promise<string> {
  const nowMs = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAtMs - TOKEN_REFRESH_BUFFER_MS > nowMs
  ) {
    return cachedAccessToken.token;
  }

  const jwt = buildServiceAccountJwt(account);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    const detail = data.error || response.statusText;
    throw new Error(`Google token exchange failed: ${detail}`);
  }

  const expiresInSec = data.expires_in ?? 3600;
  cachedAccessToken = {
    token: data.access_token,
    expiresAtMs: nowMs + expiresInSec * 1000,
  };

  return data.access_token;
}
