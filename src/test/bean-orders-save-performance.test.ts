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

  test('shipBeanOrder deferred path always fetches TrackingMore status on ship', () => {
    const deferred = functionBody('shipBeanOrder', beanOrderActions);
    expect(deferred).toContain('fetchTrackingMoreStatusWithRepair');
    expect(deferred).not.toContain('isTrackingWebhookPrimary');
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

  test('uploadBeanOrderSlip defers audit log and revalidation off the critical path', () => {
    const critical = criticalPathBeforeAfter('uploadBeanOrderSlip', beanOrderActions);
    expect(critical).not.toContain('recordDataChange');
    expect(critical).not.toContain('revalidateBeanOrders');
    const deferred = functionBody('uploadBeanOrderSlip', beanOrderActions);
    expect(deferred).toContain('after(async () => {');
    expect(deferred).toContain('recordDataChange');
    expect(deferred).toContain('revalidateBeanOrders');
  });

  test('uploadBeanOrderSlip returns signed slip URL without a follow-up fetch', () => {
    const body = functionBody('uploadBeanOrderSlip', beanOrderActions);
    expect(body).toContain('signBeanOrderSlipPath');
    expect(body).toMatch(/return\s*\{\s*success:\s*true,\s*slipUrl/);
    expect(body).toMatch(/Promise\.all/);
  });

  test('detail slip upload uses instant preview and skips redundant signed-url fetch', () => {
    expect(detailClient).toContain('pendingSlipPreview');
    expect(detailClient).toContain('URL.createObjectURL');
    expect(detailClient).not.toContain('getBeanOrderSlipSignedUrl');
    const uploadHandlerStart = detailClient.indexOf('async function handleUploadSlip');
    const uploadHandlerEnd = detailClient.indexOf('\n  async function handleConfirmPayment', uploadHandlerStart);
    const uploadHandler = detailClient.slice(uploadHandlerStart, uploadHandlerEnd);
    expect(uploadHandler).not.toContain('reload(');
    expect(uploadHandler).not.toContain('getBeanOrderSlipSignedUrl');
  });

  test('shipBeanOrder no longer returns trackingWarning (deferred TrackingMore)', () => {
    const body = functionBody('shipBeanOrder', beanOrderActions);
    expect(body).not.toMatch(/trackingWarning/);
    expect(detailClient).not.toMatch(/trackingWarning/);
  });

  test('createBeanOrder defers audit log, revalidation, and address persist off the critical path', () => {
    const critical = criticalPathBeforeAfter('createBeanOrder', beanOrderActions);
    expect(critical).not.toContain('recordDataChange');
    expect(critical).not.toContain('revalidateBeanOrders');
    expect(critical).not.toContain('saveBeanCustomerAddressIfNew');
    expect(critical).not.toContain('recordBeanOrderCreatedNotification');
    const deferred = functionBody('createBeanOrder', beanOrderActions);
    expect(deferred).toContain('after(async () => {');
    expect(deferred).toContain('recordDataChange');
    expect(deferred).toContain('recordBeanOrderCreatedNotification');
    expect(deferred).toContain('revalidateBeanOrders');
    expect(deferred).toContain('saveBeanCustomerAddressIfNew');
  });

  test('createBeanOrder parallelizes inventory, actor, and order number prep', () => {
    const critical = criticalPathBeforeAfter('createBeanOrder', beanOrderActions);
    expect(critical).toContain('Promise.all');
    expect(critical).toMatch(/Promise\.all[\s\S]*loadInventoryNames[\s\S]*resolveActorLabelFromSession[\s\S]*nextOrderNo/);
  });

  test('resolveActorLabelFromSession does not repeat ensureServerSession after gateMutation', () => {
    expect(beanOrderActions).not.toMatch(
      /async function resolveActorLabelFromSession\(\)[\s\S]*await ensureServerSession\(\)/,
    );
  });

  test('form client clears saving before navigation after create', () => {
    const formClient = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/bean-orders/BeanOrderFormClient.tsx'),
      'utf-8',
    );
    const handleSubmitStart = formClient.indexOf('async function handleSubmit');
    const handleSubmitEnd = formClient.indexOf('\n  const inputClass', handleSubmitStart);
    const handleSubmit = formClient.slice(handleSubmitStart, handleSubmitEnd);
    expect(handleSubmit).toMatch(/setSaving\(false\)[\s\S]*navigateWithViewTransition/);
  });
});
