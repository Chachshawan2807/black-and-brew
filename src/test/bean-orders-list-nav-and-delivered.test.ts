import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canConfirmDelivered,
  shouldShowAutoTrackingBadge,
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
});

describe('bean order delivered action beside shipping update', () => {
  const cancelledAt = '2026-07-22T00:00:00Z';

  test('shows green delivered button only without tracking number', () => {
    expect(shouldShowDeliveredButton('pending', null, null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', null, '', null, 'kerryexpress-th')).toBe(true);
    expect(shouldShowDeliveredButton('shipped', 'in_transit', '  ', null, 'kerryexpress-th')).toBe(true);
    expect(shouldShowDeliveredButton('shipped', null, 'KEX123', null, 'kerryexpress-th')).toBe(false);
    expect(shouldShowDeliveredButton('shipped', null, 'LM123', null, 'lalamove')).toBe(true);
    expect(shouldShowDeliveredButton('shipped', 'delivered', null)).toBe(false);
    expect(shouldShowDeliveredButton('pending', null, null, cancelledAt)).toBe(false);
  });

  test('shows auto tracking badge when tracking number is present', () => {
    expect(shouldShowAutoTrackingBadge('pending', null, 'KEX123', null, 'kerryexpress-th')).toBe(true);
    expect(shouldShowAutoTrackingBadge('shipped', 'in_transit', 'KEX123', null, 'kerryexpress-th')).toBe(true);
    expect(shouldShowAutoTrackingBadge('shipped', null, null, null, 'kerryexpress-th')).toBe(false);
    expect(shouldShowAutoTrackingBadge('shipped', 'delivered', 'KEX123', null, 'kerryexpress-th')).toBe(false);
    expect(shouldShowAutoTrackingBadge('pending', null, 'KEX123', cancelledAt, 'kerryexpress-th')).toBe(false);
    expect(shouldShowAutoTrackingBadge('shipped', null, 'LM123', null, 'lalamove')).toBe(false);
  });

  test('can confirm delivered only after shipped and not yet delivered', () => {
    expect(canConfirmDelivered('shipped', null)).toBe(true);
    expect(canConfirmDelivered('shipped', 'in_transit')).toBe(true);
    expect(canConfirmDelivered('shipped', 'delivered')).toBe(false);
    expect(canConfirmDelivered('pending', null)).toBe(false);
    expect(canConfirmDelivered('shipped', null, cancelledAt)).toBe(false);
  });

  test('detail UI switches between จัดส่งสำเร็จ and ระบบอัตโนมัติ', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).toContain('shouldShowDeliveredButton');
    expect(source).toContain('shouldShowAutoTrackingBadge');
    expect(source).toContain('BEAN_ORDER_ACTION_BTN_INFO');
    expect(source).toContain('BEAN_ORDER_ACTION_BADGE_MUTED');
    expect(source).toContain('จัดส่งสำเร็จ');
    expect(source).toContain('ระบบอัตโนมัติ');
    expect(source).toMatch(
      /showDeliveredButton[\s\S]{0,500}?จัดส่งสำเร็จ[\s\S]{0,500}?showAutoTrackingBadge[\s\S]{0,400}?ระบบอัตโนมัติ/,
    );
  });
});
