import { buildBruReport } from '@/lib/agents/report-response';
import type { InventoryStockFields } from '@/lib/inventory-stock';

type LowStockItem = InventoryStockFields & { name?: string; unit?: string; source?: string };

function suggestedOrder(item: LowStockItem): number {
  const orderQty = Number(item.order_qty ?? 0);
  if (orderQty > 0) return orderQty;
  return Math.max(Number(item.target_stock ?? 0) - Number(item.stock ?? 0), 0);
}

export function formatLowStockChatResponse(items: LowStockItem[]): string {
  if (items.length === 0) {
    return buildBruReport({
      header: '📦 สรุปรายการสินค้าที่ต้องสั่งเติม',
      bullets: [],
      emptyMessage: 'สต็อกทุกรายการอยู่ในระดับปกติ ไม่มีรายการใดต้องสั่งเติมในขณะนี้',
    });
  }

  const sorted = [...items].sort(
    (a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0),
  );

  const sourceBreakdown: Record<string, number> = {};
  for (const item of items) {
    const src = item.source ?? 'ไม่ระบุช่องทาง';
    sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
  }

  const bullets = sorted.slice(0, 5).map((item) => {
    const unit = item.unit ?? 'หน่วย';
    return `${item.name ?? 'ไม่ระบุ'} — สต็อก: ${item.stock ?? 0} ${unit} | จุดสั่งซื้อ: ${item.order_point ?? 0} | แนะนำสั่ง: ${suggestedOrder(item)} ${unit}`;
  });

  const breakdown = Object.entries(sourceBreakdown)
    .map(([src, n]) => `${src} ${n} รายการ`)
    .join(', ');

  bullets.push(`แยกตามช่องทาง: ${breakdown}`);

  return buildBruReport({
    header: '📦 สรุปรายการสินค้าที่ต้องสั่งเติม',
    bullets,
    footerCount: { label: 'รายการที่ต้องเติมสต็อก', count: items.length },
    maxBullets: 6,
  });
}
