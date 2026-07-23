import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { notifyBeanOrderDelivered } from '../src/lib/bean-orders/delivery-web-push';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const stamp = Date.now();
  const orderId = `test-delivered-${stamp}`;

  const result = await notifyBeanOrderDelivered({
    orderId,
    orderNo: `BO-TEST-${stamp}`,
    customerName: 'ทัพพ์เทพ นิจนิรันดร์กุล',
    destination: {
      subdistrict: 'คึกคัก',
      district: 'เมืองพังงา',
      province: 'พังงา',
    },
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
