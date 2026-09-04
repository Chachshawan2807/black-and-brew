import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { pickClientIp } from '@/lib/security/request-ip';
import { sanitizeXssPayload, sanitizePromptInput } from '@/lib/security/sanitize';
import { timingSafeEqualText } from '@/lib/security/timing-safe';
import { toPublicErrorMessage } from '@/lib/security/public-error';
import { buildSecurityHeaders } from '@/lib/security/headers';

describe('pickClientIp', () => {
  test('prefers the platform client IP over a spoofed forwarded chain', () => {
    const ip = pickClientIp((name) => {
      if (name === 'x-forwarded-for') return '198.51.100.1, 10.0.0.1';
      if (name === 'x-vercel-forwarded-for') return '203.0.113.77';
      return null;
    });
    expect(ip).toBe('203.0.113.77');
  });

  test('keeps the first valid hop when only x-forwarded-for is present', () => {
    expect(pickClientIp((name) => (name === 'x-forwarded-for' ? '203.0.113.10, 10.0.0.1' : null))).toBe(
      '203.0.113.10',
    );
    expect(pickClientIp((name) => (name === 'x-forwarded-for' ? '198.51.100.42' : null))).toBe(
      '198.51.100.42',
    );
  });

  test('rejects header injection and non-IP values', () => {
    expect(pickClientIp((name) => (name === 'x-forwarded-for' ? 'not-an-ip' : null))).toBeNull();
    expect(
      pickClientIp((name) => (name === 'x-real-ip' ? '1.2.3.4\r\nX-Injected: 1' : null)),
    ).toBeNull();
  });
});

describe('timingSafeEqualText', () => {
  test('accepts matching secrets and rejects mismatches without throwing', () => {
    expect(timingSafeEqualText('123456', '123456')).toBe(true);
    expect(timingSafeEqualText('123456', '111222')).toBe(false);
    expect(timingSafeEqualText('short', 'much-longer-secret')).toBe(false);
    expect(timingSafeEqualText('', 'x')).toBe(false);
  });
});

describe('toPublicErrorMessage', () => {
  test('never returns raw exception text to clients', () => {
    expect(toPublicErrorMessage(new Error('relation "users" does not exist'))).toBe(
      'Internal Server Error',
    );
    expect(toPublicErrorMessage('ECONNREFUSED 127.0.0.1:5432')).toBe('Internal Server Error');
    expect(toPublicErrorMessage(undefined)).toBe('Internal Server Error');
  });
});

describe('sanitizeXssPayload', () => {
  test('strips script, event-handler, and javascript URL payloads', () => {
    expect(sanitizeXssPayload('<script>alert(1)</script>hello')).toBe('hello');
    expect(sanitizeXssPayload('<img src=x onerror=alert(1)>')).not.toMatch(/onerror/i);
    expect(sanitizeXssPayload('<svg onload=alert(1)>')).not.toMatch(/onload/i);
    expect(sanitizeXssPayload('javascript:alert(1)')).not.toMatch(/javascript:/i);
  });

  test('leaves ordinary staff text unchanged', () => {
    expect(sanitizeXssPayload('นมสด 2 ลิตร')).toBe('นมสด 2 ลิตร');
    expect(sanitizePromptInput('สรุปยอดวันนี้')).toBe('สรุปยอดวันนี้');
  });
});

describe('buildSecurityHeaders', () => {
  test('includes clickjacking, MIME, and object-src hardening', () => {
    const headers = buildSecurityHeaders(true);
    const byKey = Object.fromEntries(headers.map((header) => [header.key, header.value]));
    expect(byKey['X-Frame-Options']).toBe('DENY');
    expect(byKey['X-Content-Type-Options']).toBe('nosniff');
    expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(byKey['Content-Security-Policy']).toContain("object-src 'none'");
    expect(byKey['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(byKey['Content-Security-Policy']).not.toContain('unsafe-eval');
  });
});

describe('next.config security wiring', () => {
  test('uses the shared security header builder', () => {
    const source = readFileSync(resolve(process.cwd(), 'next.config.ts'), 'utf8');
    expect(source).toContain('buildSecurityHeaders');
    expect(source).toContain('lib/security/headers');
  });
});
