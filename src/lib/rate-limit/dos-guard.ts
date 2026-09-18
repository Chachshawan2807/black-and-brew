import { NextRequest, NextResponse } from 'next/server';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit/sliding-window';
import { pickClientIp } from '@/lib/security/client-ip';

export type DosBucket = 'page' | 'api' | 'mutation' | 'expensive';

export type DosWindow = {
  maxRequests: number;
  windowMs: number;
};

export type DosGuardOptions = {
  maxBodyBytes?: number;
  burst?: DosWindow;
  page?: DosWindow;
  api?: DosWindow;
  mutation?: DosWindow;
  expensive?: DosWindow;
  maxKeys?: number;
};

type DosLimiterSet = Record<'burst' | DosBucket, SlidingWindowRateLimiter>;

/** Baked-in ERP defaults. No extra env or dashboard setup required. */
export const DEFAULT_DOS_POLICY = {
  maxBodyBytes: 8 * 1024 * 1024,
  burst: { maxRequests: 80, windowMs: 10_000 },
  page: { maxRequests: 300, windowMs: 60_000 },
  api: { maxRequests: 120, windowMs: 60_000 },
  mutation: { maxRequests: 180, windowMs: 60_000 },
  expensive: { maxRequests: 30, windowMs: 60_000 },
  maxKeys: 10_000,
} as const;

const EXPENSIVE_API_PATHS = [
  '/api/daily-report',
  '/api/insight-alerts',
  '/api/data-change-log-retention',
  '/api/home/refresh',
  '/api/push/webhook',
] as const;

const PROBE_PREFIXES = [
  '/.env',
  '/.git',
  '/.aws',
  '/wp-admin',
  '/wp-login',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/phpinfo',
  '/vendor/phpunit',
  '/actuator',
  '/cgi-bin',
  '/server-status',
] as const;

let defaultGuard: ReturnType<typeof createDosGuard> | null = null;

function normalizePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname).toLowerCase().replace(/\\/g, '/');
  } catch {
    return pathname.toLowerCase().replace(/\\/g, '/');
  }
}

export function isDosProbePath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return PROBE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`) || normalized.startsWith(prefix),
  );
}

export function classifyDosPath(pathname: string, method: string): DosBucket {
  const path = normalizePathname(pathname);
  if (EXPENSIVE_API_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return 'expensive';
  }

  const upper = method.toUpperCase();
  const isWrite = upper === 'POST' || upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE';
  if (path.startsWith('/api/')) {
    return isWrite ? 'mutation' : 'api';
  }
  return isWrite ? 'mutation' : 'page';
}

export function isOversizedDosBody(contentLength: string | null, maxBytes: number): boolean {
  if (contentLength == null || contentLength.trim() === '') return false;
  const raw = contentLength.trim();
  if (!/^\d+$/.test(raw)) return true;
  const size = Number(raw);
  return !Number.isSafeInteger(size) || size > maxBytes;
}

function timingSafeEqualUtf16(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

function hasTrustedAutomationBearer(request: NextRequest): boolean {
  const header = request.headers.get('authorization');
  if (!header) return false;
  const presented = header.trim();
  for (const secret of [process.env.CRON_SECRET, process.env.PUSH_WEBHOOK_SECRET]) {
    const trimmed = secret?.trim();
    if (!trimmed) continue;
    if (timingSafeEqualUtf16(presented, `Bearer ${trimmed}`)) return true;
  }
  return false;
}

function deny(status: number, retryAfterMs?: number): NextResponse {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (retryAfterMs != null) {
    headers.set('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  }

  const error =
    status === 429 ? 'Too Many Requests' : status === 413 ? 'Payload Too Large' : 'Not Found';
  return NextResponse.json({ error }, { status, headers });
}

function createLimiter(window: DosWindow, maxKeys: number): SlidingWindowRateLimiter {
  return new SlidingWindowRateLimiter(window.maxRequests, window.windowMs, maxKeys);
}

export function createDosGuard(options: DosGuardOptions = {}) {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_DOS_POLICY.maxBodyBytes;
  const maxKeys = options.maxKeys ?? DEFAULT_DOS_POLICY.maxKeys;
  const burst = options.burst ?? DEFAULT_DOS_POLICY.burst;
  const page = options.page ?? DEFAULT_DOS_POLICY.page;
  const api = options.api ?? DEFAULT_DOS_POLICY.api;
  const mutation = options.mutation ?? DEFAULT_DOS_POLICY.mutation;
  const expensive = options.expensive ?? DEFAULT_DOS_POLICY.expensive;

  const limiters: DosLimiterSet = {
    burst: createLimiter(burst, maxKeys),
    page: createLimiter(page, maxKeys),
    api: createLimiter(api, maxKeys),
    mutation: createLimiter(mutation, maxKeys),
    expensive: createLimiter(expensive, maxKeys),
  };

  return {
    async inspect(request: NextRequest): Promise<NextResponse | null> {
      const { pathname } = request.nextUrl;
      if (isDosProbePath(pathname)) {
        return deny(404);
      }

      if (isOversizedDosBody(request.headers.get('content-length'), maxBodyBytes)) {
        return deny(413);
      }

      if (hasTrustedAutomationBearer(request)) {
        return null;
      }

      const ip =
        pickClientIp((name) => request.headers.get(name)) ??
        request.headers.get('x-vercel-ip') ??
        'unknown';
      const bucket = classifyDosPath(pathname, request.method);
      const now = Date.now();

      const burstResult = limiters.burst.check(ip);
      if (!burstResult.allowed) {
        return deny(429, burstResult.resetAt - now);
      }

      const bucketResult = limiters[bucket].check(ip);
      if (!bucketResult.allowed) {
        return deny(429, bucketResult.resetAt - now);
      }

      return null;
    },
  };
}

/** Shared guard used by `src/proxy.ts` on every matched request. */
export function inspectRequestForDos(request: NextRequest): Promise<NextResponse | null> {
  defaultGuard ??= createDosGuard();
  return defaultGuard.inspect(request);
}
