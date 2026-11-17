import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

  test('detail page does not show success flash banners', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(source).not.toContain('BeanOrderStatusMessages');
    expect(source).not.toContain("sessionStorage.getItem('bb-bean-order-flash')");
    expect(source).not.toContain('OrderListStatusGroup');
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

  test('slip upload success redirects to bean-orders list with flash message', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const uploadFnStart = detailSource.indexOf('async function handleUploadSlip');
    expect(uploadFnStart).toBeGreaterThan(-1);
    const uploadFnBody = detailSource.slice(uploadFnStart, uploadFnStart + 1100);
    expect(uploadFnBody).toContain('goToBeanOrderList');
    expect(uploadFnBody).toContain("replacingSlip ? 'เปลี่ยนสลิปแล้ว' : 'อัปโหลดสลิปแล้ว'");
    expect(uploadFnBody).not.toContain('void reload()');
  });

  test('confirm payment success redirects to bean-orders list with flash message', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    const fnStart = detailSource.indexOf('async function handleConfirmPayment');
    const fnBody = detailSource.slice(fnStart, fnStart + 900);
    expect(fnBody).toContain("goToBeanOrderList('ยืนยันชำระเงินแล้ว')");
  });

  test('create order success redirects to bean-orders list with flash message', () => {
    const formSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderFormClient.tsx'),
      'utf8',
    );
    expect(formSource).toContain('stashBeanOrderCreatedPatch');
    expect(formSource).toContain("'สร้างออเดอร์สำเร็จ'");
    expect(formSource).toContain("sessionStorage.setItem('bb-bean-order-flash', flashMessage)");
    expect(formSource).toMatch(
      /'orderId' in result && result\.orderId[\s\S]*navigateWithViewTransition\(\s*router\.push,\s*`\/\$\{locale\}\/bean-orders`\s*\)/,
    );
  });

  test('detail shipment save marks shipped when tracking present', () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx'),
      'utf8',
    );
    expect(detailSource).toContain("intent: 'detail_update'");
    expect(detailSource).not.toContain('shipBeanOrder');
    expect(detailSource).toContain('handleConfirmDelivered');
    expect(detailSource).toContain('confirmBeanOrderDelivered');
  });
});
