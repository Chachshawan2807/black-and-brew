import { describe, expect, test } from 'vitest';
import {
  INTENT_THRESHOLD,
  classifyIntent,
  dominantIntents,
} from '@/lib/agents/intent/classify-intent';

describe('classifyIntent', () => {
  test('scores schedule queries above threshold', () => {
    const scores = classifyIntent('ขอตารางงานพนักงานวันพรุ่งนี้');
    expect(scores.schedule).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores inventory low-stock queries', () => {
    const scores = classifyIntent('สรุปสินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ');
    expect(scores.inventory).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores sales queries', () => {
    const scores = classifyIntent('สรุปยอดขายสัปดาห์นี้');
    expect(scores.sales).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores holiday queries', () => {
    const scores = classifyIntent('วันหยุดนักขัตฤกษ์ใกล้ๆ นี้มีอะไรบ้าง');
    expect(scores.holiday).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores bean orders queries', () => {
    const scores = classifyIntent('คำสั่งซื้อเมล็ดกาแฟค้างชำระมีกี่ออเดอร์');
    expect(scores.beanOrders).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores inventory accuracy queries', () => {
    const scores = classifyIntent('รายงานความแม่นยำการนับสต็อก');
    expect(scores.inventoryAccuracy).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores store status overview queries', () => {
    const scores = classifyIntent('วันนี้ร้านเป็นยังไงบ้าง');
    expect(scores.storeStatus).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('scores maintenance queries', () => {
    const scores = classifyIntent('งานซ่อมบำรุงที่ควรทำเร็วๆ นี้');
    expect(scores.maintenance).toBeGreaterThanOrEqual(INTENT_THRESHOLD);
  });

  test('dominantIntents returns intents at or above threshold', () => {
    const scores = classifyIntent('ยอดขายวันนี้ และสต็อกต่ำอะไรบ้าง');
    const names = dominantIntents(scores);
    expect(names).toContain('sales');
    expect(names).toContain('inventory');
  });
});
