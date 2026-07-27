import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canDeleteOrder } from '@/lib/bean-orders/order-status';

describe('bean order delete', () => {
  const cancelledAt = '2026-07-22T00:00:00Z';

  test('can delete only before shipped', () => {
    expect(canDeleteOrder('pending')).toBe(true);
    expect(canDeleteOrder('shipped')).toBe(false);
    expect(canDeleteOrder('pending', cancelledAt)).toBe(true);
  });

  test('detail UI labels action as delete order', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).toContain('ลบออเดอร์');
    expect(source).toContain('ลบออเดอร์นี้?');
    expect(source).not.toContain('ยกเลิกออเดอร์');
    expect(source).toContain('deleteBeanOrder');
    expect(source).not.toContain('cancelBeanOrder');
  });

  test('server action hard-deletes the order row', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/actions/bean-order-actions.ts'),
      'utf8',
    );
    expect(source).toContain('export async function deleteBeanOrder');
    expect(source).not.toContain('export async function cancelBeanOrder');

    const fnStart = source.indexOf('export async function deleteBeanOrder');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = source.slice(fnStart, fnStart + 1800);
    expect(fnBody).toMatch(/\.from\('bean_orders'\)[\s\S]*\.delete\(\)/);
    expect(fnBody).not.toContain('cancelled_at: new Date().toISOString()');
    expect(fnBody).toContain("action: 'DELETE'");
  });
});
