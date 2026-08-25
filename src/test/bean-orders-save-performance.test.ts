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
  test('shipBeanOrder does not sync external tracking on the critical path', () => {
    expect(beanOrderActions).toContain("import { after } from 'next/server'");
    const critical = criticalPathBeforeAfter('shipBeanOrder', beanOrderActions);
    expect(critical).not.toContain('syncTrackingMoreShipmentStatus');
    const deferred = functionBody('shipBeanOrder', beanOrderActions);
    expect(deferred).toContain('after(async () => {');
    expect(deferred).not.toContain('syncTrackingMoreShipmentStatus');
  });

  test('shipBeanOrder deferred path only handles shipped notification and revalidation', () => {
    const deferred = functionBody('shipBeanOrder', beanOrderActions);
    expect(deferred).not.toContain('syncTrackingMoreShipmentStatus');
    expect(deferred).not.toContain('shouldSyncBeanOrderTrackingAfterShip');
    expect(deferred).toContain('notifyBeanOrderShipped');
    expect(deferred).toContain('revalidateBeanOrders');
  });

  test('shipBeanOrder preserves cached tracking when shipment identity is unchanged', () => {
    const critical = criticalPathBeforeAfter('shipBeanOrder', beanOrderActions);
    expect(critical).toContain('shouldResetBeanOrderTrackingOnShip');
    expect(critical).toMatch(/tracking_status:\s*resetTracking/);
    expect(critical).toMatch(/tracking_raw:\s*resetTracking/);
  });

  test('confirmBeanOrderDelivered does not await delivery notification', () => {
    const body = functionBody('confirmBeanOrderDelivered', beanOrderActions);
    expect(body).not.toMatch(/await maybeNotifyBeanOrderDelivered/);
    expect(beanOrderActions).toMatch(
      /scheduleBeanOrderDeliveredSideEffects[\s\S]*void import\('@\/lib\/bean-orders\/notify-delivered'\)/,
    );
  });

  test('confirmBeanOrderDelivered defers audit log and revalidation off the critical path', () => {
    const critical = functionBody('confirmBeanOrderDelivered', beanOrderActions);
    expect(critical).not.toContain('revalidateBeanOrders');
    expect(critical).not.toContain('recordDataChange');
    expect(critical).toContain('scheduleBeanOrderDeliveredSideEffects');
    const sideEffectsStart = beanOrderActions.indexOf('function scheduleBeanOrderDeliveredSideEffects');
    const sideEffectsEnd = beanOrderActions.indexOf('export async function confirmBeanOrderDelivered');
    const sideEffects = beanOrderActions.slice(sideEffectsStart, sideEffectsEnd);
    expect(sideEffects).toContain('after(async () => {');
    expect(sideEffects).toContain('recordDataChange');
    expect(sideEffects).toContain('revalidateBeanOrders');
  });

  test('confirmBeanOrderDelivered parallelizes order, shipment, and actor prep', () => {
    const critical = criticalPathBeforeAfter('confirmBeanOrderDelivered', beanOrderActions);
    expect(critical).toContain('Promise.all');
    expect(critical).toMatch(
      /Promise\.all[\s\S]*bean_orders[\s\S]*bean_order_shipments[\s\S]*resolveActorLabelFromSession/,
    );
  });

  test('confirmBeanOrderDelivered inlines pending ship+deliver instead of calling shipBeanOrder', () => {
    const body = functionBody('confirmBeanOrderDelivered', beanOrderActions);
    expect(body).not.toMatch(/await shipBeanOrder/);
    expect(body).toMatch(/fulfillmentStatus === 'pending'[\s\S]*upsert/);
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

  test('shipBeanOrder no longer returns trackingWarning', () => {
    const body = functionBody('shipBeanOrder', beanOrderActions);
    expect(body).not.toMatch(/trackingWarning/);
    expect(detailClient).not.toMatch(/trackingWarning/);
  });

  test('createBeanOrder defers audit log, revalidation, and address persist off the critical path', () => {
    const critical = criticalPathBeforeAfter('createBeanOrder', beanOrderActions);
    expect(critical).not.toContain('recordDataChange');
    expect(critical).not.toContain('revalidateBeanOrders');
    expect(critical).not.toContain('saveBeanCustomerAddressIfNew');
    expect(critical).not.toContain('notifyBeanOrderCreated');
    const deferred = functionBody('createBeanOrder', beanOrderActions);
    expect(deferred).toContain('after(async () => {');
    expect(deferred).toContain('recordDataChange');
    expect(deferred).toContain('notifyBeanOrderCreated');
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

  test('detail deliver clears busy before navigation after success', () => {
    const deliverFnStart = detailClient.indexOf('async function handleConfirmDelivered');
    const deliverFnEnd = detailClient.indexOf('\n  async function handleDelete', deliverFnStart);
    const deliverFn = detailClient.slice(deliverFnStart, deliverFnEnd);
    expect(deliverFn).toMatch(/setBusy\(false\)[\s\S]*navigateWithViewTransition/);
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
