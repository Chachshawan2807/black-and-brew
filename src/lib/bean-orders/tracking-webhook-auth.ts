import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_HEADER_NAMES = ['signature', 'x-signature', 'trackingmore-signature'] as const;
const TIMESTAMP_HEADER_NAMES = ['timestamp', 'x-timestamp', 'trackingmore-timestamp'] as const;
const DEFAULT_MAX_AGE_SECONDS = 10 * 60;

export type TrackingMoreWebhookVerifyInput = {
  secret: string;
  timestamp: string;
  signature: string;
};

function readHeader(headers: Headers, names: readonly string[]): string | null {
  for (const name of names) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function readStringField(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** TrackingMore V4: HMAC-SHA256(webhook_secret, timestamp) → hex digest. */
export function computeTrackingMoreWebhookSignature(
  secret: string,
  timestamp: string,
): string {
  return createHmac('sha256', secret).update(timestamp, 'utf8').digest('hex');
}

function decodeSignatureBuffer(signature: string): Buffer | null {
  const trimmed = signature.trim();
  if (!trimmed) return null;

  if (/^[0-9a-f]+$/i.test(trimmed) && trimmed.length % 2 === 0) {
    return Buffer.from(trimmed, 'hex');
  }

  try {
    return Buffer.from(trimmed, 'base64');
  } catch {
    return null;
  }
}

function safeEqualSignatures(expectedHex: string, provided: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const received = decodeSignatureBuffer(provided);
  if (!received || expected.length !== received.length) return false;

  try {
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

export function isTrackingMoreWebhookTimestampFresh(
  timestamp: string,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(nowSeconds - parsed) <= maxAgeSeconds;
}

export function verifyTrackingMoreWebhookSignature(
  input: TrackingMoreWebhookVerifyInput,
): boolean {
  const secret = input.secret.trim();
  const timestamp = input.timestamp.trim();
  const signature = input.signature.trim();
  if (!secret || !timestamp || !signature) return false;

  const expected = computeTrackingMoreWebhookSignature(secret, timestamp);
  return safeEqualSignatures(expected, signature);
}

export function extractTrackingMoreWebhookCredentials(
  headers: Headers,
  payload: Record<string, unknown>,
): { timestamp: string; signature: string } | null {
  const headerTimestamp = readHeader(headers, TIMESTAMP_HEADER_NAMES);
  const headerSignature = readHeader(headers, SIGNATURE_HEADER_NAMES);
  if (headerTimestamp && headerSignature) {
    return { timestamp: headerTimestamp, signature: headerSignature };
  }

  for (const key of ['verify', 'verifyInfo'] as const) {
    const block = payload[key];
    if (!isRecord(block)) continue;
    const timestamp = readStringField(block, 'timestamp', 'timeStr', 'time');
    const signature = readStringField(block, 'signature');
    if (timestamp && signature) {
      return { timestamp, signature };
    }
  }

  return null;
}

export function verifyTrackingMoreWebhookRequest(options: {
  secret: string | null | undefined;
  headers: Headers;
  payload: Record<string, unknown>;
  nowSeconds?: number;
  allowStaleTimestamp?: boolean;
}): { ok: true } | { ok: false; reason: 'missing_secret' | 'missing_credentials' | 'stale_timestamp' | 'invalid_signature' } {
  const secret = options.secret?.trim();
  if (!secret) return { ok: false, reason: 'missing_secret' };

  const credentials = extractTrackingMoreWebhookCredentials(options.headers, options.payload);
  if (!credentials) return { ok: false, reason: 'missing_credentials' };

  if (
    !options.allowStaleTimestamp &&
    !isTrackingMoreWebhookTimestampFresh(credentials.timestamp, DEFAULT_MAX_AGE_SECONDS, options.nowSeconds)
  ) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  if (!verifyTrackingMoreWebhookSignature({ secret, ...credentials })) {
    return { ok: false, reason: 'invalid_signature' };
  }

  return { ok: true };
}
