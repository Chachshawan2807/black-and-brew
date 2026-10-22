import { describe, expect, test } from 'vitest';
import { isBeanOrderEditDataReady } from '@/lib/bean-orders/form-readiness';

describe('bean order edit form readiness', () => {
  test('blocks edit form until the order and id are both available', () => {
    expect(isBeanOrderEditDataReady('edit', 'order-1', false)).toBe(false);
    expect(isBeanOrderEditDataReady('edit', undefined, true)).toBe(false);
    expect(isBeanOrderEditDataReady('edit', 'order-1', true)).toBe(true);
  });

  test('keeps create forms ready without an existing order', () => {
    expect(isBeanOrderEditDataReady('create', undefined, false)).toBe(true);
  });
});
