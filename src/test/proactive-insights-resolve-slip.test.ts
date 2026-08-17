import { describe, expect, test } from 'vitest';
import { resolveBeanOrderSlipUploadedAt } from '@/lib/proactive-insights/resolve-bean-order-slip';

describe('resolveBeanOrderSlipUploadedAt', () => {
  test('prefers uploaded_at when present', () => {
    expect(
      resolveBeanOrderSlipUploadedAt({
        uploaded_at: '2026-08-18T02:00:00.000Z',
        slip_url: 'order-1/slip.jpg',
      }),
    ).toBe('2026-08-18T02:00:00.000Z');
  });

  test('falls back to slip_url when uploaded_at is missing', () => {
    expect(
      resolveBeanOrderSlipUploadedAt({
        uploaded_at: null,
        slip_url: 'order-1/slip.jpg',
      }),
    ).toBe('order-1/slip.jpg');
  });

  test('reads the first payment row from nested arrays', () => {
    expect(
      resolveBeanOrderSlipUploadedAt([
        { uploaded_at: '2026-08-18T02:00:00.000Z', slip_url: 'order-1/slip.jpg' },
      ]),
    ).toBe('2026-08-18T02:00:00.000Z');
  });
});
