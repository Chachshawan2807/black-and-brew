import { notifyBeanOrderDelivered } from '../src/lib/bean-orders/delivery-web-push';

async function main() {
  const stamp = Date.now();
  const orderId = `test-delivered-${stamp}`;

  const result = await notifyBeanOrderDelivered({
    orderId,
    orderNo: `BO-TEST-${stamp}`,
    customerName: 'ทดสอบแจ้งเตือน (E2E)',
    trackingNumber: `KEX${stamp}`,
    carrierCode: 'kerryexpress-th',
    locale: 'th',
  });

  console.log(JSON.stringify({ orderId, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
