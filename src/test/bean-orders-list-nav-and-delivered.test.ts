import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canConfirmDelivered,
  shouldShowDeliveredButton,
} from '@/lib/bean-orders/order-status';

describe('bean order navigation after save/delete', () => {
  test('form save success redirects to bean-orders list', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderFormClient.tsx'),
      'utf8',
    );
    expect(source).toContain('navigateWithViewTransition');
    expect(source).toMatch(
      /navigateWithViewTransition\(\s*router\.push,\s*`\/\$\{locale\}\/bean-orders`\s*\)/,
    );
    expect(source).not.toMatch(
      /setSaving\(false\);\s*if \(isEdit && orderId\) \{\s*router\.push\(`\/\$\{locale\}\/bean-orders\/\$\{orderId\}`\)/,
    );
  });

  test('detail page reads shipment flash message when pathname changes', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).toContain("sessionStorage.getItem('bb-bean-order-flash')");
    expect(source).toContain('usePathname');
    expect(source).toMatch(/useEffect\([\s\S]*bb-bean-order-flash[\s\S]*\[pathname\]/);
  });

  test('detail page clears stale message when pathname changes without flash', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const flashEffect = source.match(
      /useEffect\(\(\) => \{[\s\S]*?bb-bean-order-flash[\s\S]*?\}, \[pathname\]\)/,
    );
    expect(flashEffect?.[0]).toBeTruthy();
    expect(flashEffect![0]).toMatch(/if \(flash\) \{[\s\S]*setMessage\(flash\)[\s\S]*\} else \{[\s\S]*setMessage\(null\)/);
  });

  test('detail delete success redirects to bean-orders list', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const deleteFnStart = source.indexOf('async function handleDelete');
    expect(deleteFnStart).toBeGreaterThan(-1);
    const deleteFnBody = source.slice(deleteFnStart, deleteFnStart + 600);
    expect(deleteFnBody).toMatch(
      /navigateWithViewTransition\(\s*router\.push,\s*`\/\$\{locale\}\/bean-orders`\s*\)/,
    );
  });

  test('deliver success redirects to bean-orders list with flash message', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const deliverFnStart = detailSource.indexOf('async function handleConfirmDelivered');
    expect(deliverFnStart).toBeGreaterThan(-1);
    const deliverFnBody = detailSource.slice(deliverFnStart, deliverFnStart + 1200);
    expect(deliverFnBody).toMatch(
      /sessionStorage\.setItem\('bb-bean-order-flash',\s*'จัดส่งสำเร็จ'\)/,
    );
    expect(deliverFnBody).toMatch(
      /navigateWithViewTransition\(\s*router\.push,\s*`\/\$\{locale\}\/bean-orders`\s*\)/,
    );
    expect(deliverFnBody).not.toContain('void reload()');

    const listSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrdersClient.tsx'),
      'utf8',
    );
    expect(listSource).toContain("sessionStorage.getItem('bb-bean-order-flash')");
  });

  test('deliver uses single confirmBeanOrderDelivered call with optional shipment', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const deliverFnStart = detailSource.indexOf('async function handleConfirmDelivered');
    const deliverFnBody = detailSource.slice(deliverFnStart, deliverFnStart + 1200);
    expect(deliverFnBody).toMatch(/confirmBeanOrderDelivered\([\s\S]*?\{[\s\S]*?shipment:/);
    expect(deliverFnBody).not.toMatch(
      /if \(order\.fulfillmentStatus !== 'shipped'\)[\s\S]*?await shipBeanOrder/,
    );

    const actionsSource = readFileSync(
      resolve(process.cwd(), 'src/app/actions/bean-order-actions.ts'),
      'utf8',
    );
    expect(actionsSource).toMatch(
      /confirmBeanOrderDelivered\([\s\S]*?options\?[\s\S]*?shipment/,
    );
    expect(actionsSource).not.toMatch(
      /confirmBeanOrderDelivered[\s\S]*?await shipBeanOrder/,
    );
  });
});

describe('bean order delivered action beside shipping update', () => {
  const cancelledAt = '2026-07-22T00:00:00Z';

  test('shows green delivered button for pending and shipped orders', () => {
    expect(shouldShowDeliveredButton('pending', null, null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', null, '', null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', 'in_transit', '  ', null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', null, 'KEX123', null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', null, 'LM123', null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', 'delivered', null)).toBe(false);
    expect(shouldShowDeliveredButton('pending', null, null, cancelledAt)).toBe(false);
  });

  test('can confirm delivered only after shipped and not yet delivered', () => {
    expect(canConfirmDelivered('shipped', null)).toBe(true);
    expect(canConfirmDelivered('shipped', 'in_transit')).toBe(true);
    expect(canConfirmDelivered('shipped', 'delivered')).toBe(false);
    expect(canConfirmDelivered('pending', null)).toBe(false);
    expect(canConfirmDelivered('shipped', null, cancelledAt)).toBe(false);
  });

  test('manual deliver suppresses shipped notification when pre-shipping pending order', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const actionsSource = readFileSync(
      resolve(process.cwd(), 'src/app/actions/bean-order-actions.ts'),
      'utf8',
    );

    expect(detailSource).toMatch(
      /handleConfirmDelivered[\s\S]*?confirmBeanOrderDelivered\([\s\S]*?shipment:/,
    );
    expect(actionsSource).toMatch(
      /confirmBeanOrderDelivered[\s\S]*?fulfillmentStatus === 'pending'[\s\S]*?action: 'shipped'/,
    );
    expect(actionsSource).toMatch(
      /confirmBeanOrderDelivered[\s\S]*?action: 'delivery_confirmed'/,
    );
  });

  test('detail UI shows manual delivered button', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).toContain('shouldShowDeliveredButton');
    expect(source).toContain('BEAN_ORDER_ACTION_BTN_INFO');
    expect(source).toContain('จัดส่งสำเร็จ');
    expect(source).not.toContain('shouldShowAutoTrackingBadge');
    expect(source).not.toContain('ระบบอัตโนมัติ');
  });
});
