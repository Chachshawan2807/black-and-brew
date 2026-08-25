import { describe, expect, it, afterEach } from 'vitest';
import {
  isTrackingWebhookPrimary,
  resolveTrackingSyncMode,
  resolveTrackingWebhookUrl,
} from '@/lib/bean-orders/tracking-config';

describe('tracking-config', () => {
  const originalSecret = process.env.TRACKING_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TRACKING_WEBHOOK_SECRET;
    } else {
      process.env.TRACKING_WEBHOOK_SECRET = originalSecret;
    }
  });

  it('treats webhook as primary when TRACKING_WEBHOOK_SECRET is set', () => {
    process.env.TRACKING_WEBHOOK_SECRET = 'secret';
    expect(isTrackingWebhookPrimary()).toBe(true);
  });

  it('does not treat webhook as primary when secret is missing', () => {
    delete process.env.TRACKING_WEBHOOK_SECRET;
    expect(isTrackingWebhookPrimary()).toBe(false);
  });

  it('builds the public webhook URL from site origin', () => {
    expect(resolveTrackingWebhookUrl('https://erp.example.com/')).toBe(
      'https://erp.example.com/api/bean-orders/tracking-webhook',
    );
  });

  it('defaults sync mode to stale', () => {
    expect(resolveTrackingSyncMode(new URLSearchParams())).toBe('stale');
    expect(resolveTrackingSyncMode(new URLSearchParams('mode=stale'))).toBe('stale');
  });

  it('uses open sync for mode=open or legacy mode=full', () => {
    expect(resolveTrackingSyncMode(new URLSearchParams('mode=open'))).toBe('open');
    expect(resolveTrackingSyncMode(new URLSearchParams('mode=full'))).toBe('open');
  });
});
