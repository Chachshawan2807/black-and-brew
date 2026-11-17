import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('bean order deliver confirm dialog', () => {
  test('uses viewport-centered portal dialog with filled blue confirm', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).toMatch(/open=\{confirmDelivered\}[\s\S]*viewportCentered/);
    expect(source).toMatch(/open=\{confirmDelivered\}[\s\S]*portaled/);
    expect(source).toMatch(/open=\{confirmDelivered\}[\s\S]*confirmAccent="info-pastel-blue"/);
  });

  test('detail payment confirm still calls confirmBeanOrderPayment without slip guard', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const confirmFnStart = source.indexOf('async function handleConfirmPayment');
    const confirmFnEnd = source.indexOf('function requestRevertPayment', confirmFnStart);
    const confirmFn = source.slice(confirmFnStart, confirmFnEnd);
    expect(confirmFn).toContain('confirmBeanOrderPayment');
    expect(confirmFn).toContain('hasBeanOrderUploadedSlip');
    expect(confirmFn).toContain('slipUploadedAt: order.slipUploadedAt');
  });
});