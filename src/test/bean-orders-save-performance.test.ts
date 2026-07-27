import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const beanOrderActions = fs.readFileSync(
  path.resolve(__dirname, '../app/actions/bean-order-actions.ts'),
  'utf-8',
);
const detailClient = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
  'utf-8',
);

function functionBody(fnName: string, source: string): string {
  const fnStart = source.indexOf(`export async function ${fnName}`);
  expect(fnStart).toBeGreaterThan(-1);
  const fnEnd = source.indexOf('\nexport async function ', fnStart + 1);
  return source.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
}

function criticalPathBeforeAfter(fnName: string, source: string): string {
  const fnBody = functionBody(fnName, source);
  const afterIdx = fnBody.indexOf('after(async () => {');
  if (afterIdx === -1) return fnBody;
  return fnBody.slice(0, afterIdx);
}

describe('bean order save performance', () => {
  test('shipBeanOrder does not await TrackingMore on the critical path', () => {
    expect(beanOrderActions).toContain("import { after } from 'next/server'");
    const critical = criticalPathBeforeAfter('shipBeanOrder', beanOrderActions);
    expect(critical).not.toContain('await createTrackingMoreShipment');
    expect(critical).not.toContain('await fetchTrackingMoreStatusWithRepair');
    const deferred = functionBody('shipBeanOrder', beanOrderActions);
    expect(deferred).toContain('after(async () => {');
    expect(deferred).toMatch(/createTrackingMoreShipment|fetchTrackingMoreStatusWithRepair/);
  });

  test('confirmBeanOrderDelivered does not await delivery notification', () => {
    const body = functionBody('confirmBeanOrderDelivered', beanOrderActions);
    expect(body).not.toMatch(/await maybeNotifyBeanOrderDelivered/);
    expect(body).toMatch(/void maybeNotifyBeanOrderDelivered|after\(async \(\) => \{[\s\S]*maybeNotifyBeanOrderDelivered/);
  });

  test('detail client clears busy before background refresh', () => {
    expect(detailClient).toMatch(/void\s+reload\(\)/);
    expect(detailClient).not.toMatch(/await\s+reload\(\)/);
  });

  test('shipBeanOrder no longer returns trackingWarning (deferred TrackingMore)', () => {
    const body = functionBody('shipBeanOrder', beanOrderActions);
    expect(body).not.toMatch(/trackingWarning/);
    expect(detailClient).not.toMatch(/trackingWarning/);
  });
});
