export const INTENT_THRESHOLD = 2;

export type IntentScores = {
  schedule: number;
  inventory: number;
  externalSearch: number;
  maintenance: number;
  holiday: number;
  sales: number;
  beanOrders: number;
  inventoryAccuracy: number;
  storeStatus: number;
};

type Signal = { pattern: RegExp; weight: number };

function score(text: string, signals: Signal[]): number {
  return signals.reduce((sum, s) => sum + (s.pattern.test(text) ? s.weight : 0), 0);
}

const SCHEDULE_SIGNALS: Signal[] = [
  { pattern: /ตารางงาน.*(วันนี้|พรุ่งนี้|เมื่อวาน)/i, weight: 4 },
  { pattern: /(วันนี้|พรุ่งนี้|เมื่อวาน).*ตารางงาน/i, weight: 4 },
  { pattern: /กะงาน|เวร|ตารางงาน/i, weight: 3 },
  { pattern: /shift/i, weight: 3 },
  { pattern: /พนักงาน|สต้าฟ|staff/i, weight: 2 },
  { pattern: /ใครทำงาน|ใครเข้า|ใครออก|เข้ากะ/i, weight: 3 },
  { pattern: /วันนี้|พรุ่งนี้|สัปดาห์นี้/i, weight: 1 },
];

const INVENTORY_SIGNALS: Signal[] = [
  { pattern: /สต็อก|สต้อก|stock|inventory/i, weight: 3 },
  { pattern: /สินค้า|วัตถุดิบ|ingredient/i, weight: 2 },
  { pattern: /เหลือ|หมด|ขาด|เติม/i, weight: 2 },
  { pattern: /order|สั่ง|สั่งซื้อ/i, weight: 2 },
  { pattern: /คลัง|warehouse/i, weight: 3 },
  { pattern: /จุดสั่งซื้อ|low.?stock|ต้องสั่ง/i, weight: 3 },
];

const MAINTENANCE_SIGNALS: Signal[] = [
  { pattern: /ซ่อม|บำรุง|maintenance|repair/i, weight: 3 },
  { pattern: /อุปกรณ์|เครื่อง|equipment|machine/i, weight: 2 },
  { pattern: /พัง|เสีย|ชำรุด|broken/i, weight: 3 },
  { pattern: /ตรวจสอบ|check|inspect/i, weight: 1 },
];

const EXTERNAL_SEARCH_SIGNALS: Signal[] = [
  { pattern: /ค้นหา|search|google/i, weight: 3 },
  { pattern: /ข่าว|news/i, weight: 3 },
  { pattern: /เทรนด์|trend|กระแส/i, weight: 2 },
  { pattern: /ราคากาแฟ|ราคาน้ำตาล/i, weight: 3 },
];

const HOLIDAY_SIGNALS: Signal[] = [
  { pattern: /วันหยุด|นักขัตฤกษ์|เทศกาล|holiday/i, weight: 3 },
  { pattern: /หยุดเมื่อไหร่|อีกกี่วัน|วันหยุดถัดไป/i, weight: 3 },
];

const SALES_SIGNALS: Signal[] = [
  { pattern: /ยอดขาย|sales|revenue/i, weight: 3 },
  { pattern: /ขายดี|best.?seller|สินค้าขาย/i, weight: 2 },
  { pattern: /รายได้|กำไร|turnover/i, weight: 2 },
  { pattern: /product_categories|หมวดหมู่สินค้า/i, weight: 2 },
];

const BEAN_ORDERS_SIGNALS: Signal[] = [
  { pattern: /คำสั่งซื้อเมล็ด|ออเดอร์เมล็ด|bean.?order/i, weight: 4 },
  { pattern: /เมล็ดกาแฟ.*(สั่ง|ออเดอร์|ค้าง|จัดส่ง)/i, weight: 3 },
  { pattern: /ค้างชำระ|รอจัดส่ง|tracking|พัสดุ/i, weight: 2 },
  { pattern: /bean_orders|เลขที่ออเดอร์|order_no/i, weight: 3 },
];

const INVENTORY_ACCURACY_SIGNALS: Signal[] = [
  { pattern: /ความแม่นยำ|accuracy|discrepancy/i, weight: 4 },
  { pattern: /รายงาน.*(นับ|ตรวจนับ)/i, weight: 3 },
  { pattern: /ตรวจนับ.*(ผิด|คลาดเคลื่อน|แม่น)/i, weight: 3 },
  { pattern: /inventory_count_verifications/i, weight: 3 },
];

const STORE_STATUS_SIGNALS: Signal[] = [
  { pattern: /วันนี้ร้าน|สถานะร้าน|ภาพรวมร้าน|store.?status/i, weight: 4 },
  { pattern: /ร้านเป็นยังไง|ร้านวันนี้|สรุปวันนี้/i, weight: 3 },
  { pattern: /น่าเป็นห่วง|ภาพรวมวันนี้/i, weight: 2 },
];

export function classifyIntent(text: string): IntentScores {
  return {
    schedule: score(text, SCHEDULE_SIGNALS),
    inventory: score(text, INVENTORY_SIGNALS),
    maintenance: score(text, MAINTENANCE_SIGNALS),
    externalSearch: score(text, EXTERNAL_SEARCH_SIGNALS),
    holiday: score(text, HOLIDAY_SIGNALS),
    sales: score(text, SALES_SIGNALS),
    beanOrders: score(text, BEAN_ORDERS_SIGNALS),
    inventoryAccuracy: score(text, INVENTORY_ACCURACY_SIGNALS),
    storeStatus: score(text, STORE_STATUS_SIGNALS),
  };
}

export function dominantIntents(scores: IntentScores): (keyof IntentScores)[] {
  return (Object.keys(scores) as (keyof IntentScores)[]).filter(
    (key) => scores[key] >= INTENT_THRESHOLD,
  );
}

/** True when this domain is the strongest intent at or above threshold (safe for short-circuit). */
export function isSingleDomainIntent(
  scores: IntentScores,
  domain: keyof IntentScores,
): boolean {
  if (scores[domain] < INTENT_THRESHOLD) return false;
  const others = (Object.keys(scores) as (keyof IntentScores)[]).filter(
    (key) => key !== domain,
  );
  const maxOther = Math.max(0, ...others.map((key) => scores[key]));
  return scores[domain] >= maxOther;
}
