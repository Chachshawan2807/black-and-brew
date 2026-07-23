import { buildBruReport } from '@/lib/agents/report-response';
import type { BeanOrdersSummaryResult } from '@/lib/ai-data-gateway';

function baht(n: number): string {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export function formatBeanOrdersChatResponse(summary: BeanOrdersSummaryResult): string {
  if (!summary.ok) {
    return buildBruReport({
      header: '☕ คำสั่งซื้อเมล็ดกาแฟ',
      bullets: [],
      emptyMessage: 'ดึงข้อมูลคำสั่งซื้อเมล็ดกาแฟไม่สำเร็จ',
    });
  }

  if (summary.open_orders.length === 0) {
    return buildBruReport({
      header: '☕ คำสั่งซื้อเมล็ดกาแฟ',
      bullets: [],
      emptyMessage: `ในช่วง ${summary.days} วันล่าสุด ไม่มีออเดอร์ค้างชำระหรือรอจัดส่ง`,
    });
  }

  const bullets = [
    `ค้างชำระ ${summary.unpaid_count} ออเดอร์ (${baht(summary.unpaid_total_baht)} บาท)`,
    `รอจัดส่ง ${summary.pending_ship_count} ออเดอร์`,
    ...summary.open_orders.slice(0, 3).map((o) => {
      const flags = [
        o.payment_status === 'unpaid' ? 'ค้างชำระ' : null,
        o.fulfillment_status === 'pending' ? 'รอจัดส่ง' : null,
      ]
        .filter(Boolean)
        .join('/');
      return `${o.order_no} — ${o.recipient_name} | ${baht(o.total_baht)} บาท (${flags})`;
    }),
  ];

  return buildBruReport({
    header: '☕ คำสั่งซื้อเมล็ดกาแฟที่ต้องติดตาม',
    bullets,
    footerCount: { label: 'ออเดอร์เปิดอยู่', count: summary.open_orders.length },
    maxBullets: 6,
  });
}
