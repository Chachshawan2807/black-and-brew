import { buildBruReport, formatIsoDateDisplay } from '@/lib/agents/report-response';
import type { SalesSummaryResult } from '@/lib/ai-data-gateway';

function baht(n: number): string {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export function formatSalesChatResponse(summary: SalesSummaryResult): string {
  if (!summary.ok || summary.row_count === 0) {
    return buildBruReport({
      header: '📊 สรุปยอดขาย',
      bullets: [],
      emptyMessage: 'ไม่พบข้อมูลยอดขายในช่วงที่เลือก',
    });
  }

  const bullets = [
    `ช่วง ${formatIsoDateDisplay(summary.from_date)} ถึง ${formatIsoDateDisplay(summary.to_date)}`,
    `ยอดรวม ${baht(summary.total_amount)} บาท | จำนวน ${baht(summary.total_quantity)} ชิ้น`,
    ...summary.top_products.slice(0, 3).map(
      (p, i) =>
        `ขายดีอันดับ ${i + 1}: ${p.product_name} — ${baht(p.quantity)} ชิ้น (${baht(p.total_amount)} บาท)`,
    ),
  ];

  return buildBruReport({
    header: '📊 สรุปยอดขาย',
    bullets,
    footerCount: { label: 'รายการขายในชุดข้อมูล', count: summary.row_count },
    maxBullets: 6,
  });
}
