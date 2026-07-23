import { buildBruReport } from '@/lib/agents/report-response';
import type { InventoryAccuracySummary } from '@/lib/ai-data-gateway';

export function formatInventoryAccuracyChatResponse(
  summary: InventoryAccuracySummary,
): string {
  if (!summary.ok || summary.total_counts === 0) {
    return buildBruReport({
      header: '📐 รายงานความแม่นยำการนับสต็อก',
      bullets: [],
      emptyMessage: 'ยังไม่มีข้อมูลการตรวจนับเพื่อคำนวณความแม่นยำ',
    });
  }

  const pct =
    summary.overall_accuracy_pct == null
      ? '—'
      : summary.overall_accuracy_pct.toFixed(1);

  const bullets = [
    `ความแม่นยำรวม ${pct}% (${summary.matched_count}/${summary.total_counts} ครั้งตรง)`,
    `คลาดเคลื่อน ${summary.mismatched_count} ครั้ง`,
    ...summary.high_discrepancy_items.slice(0, 3).map(
      (item) =>
        `${item.item_name} — คลาดเคลื่อนรวม ${item.total_discrepancy_qty}` +
        (item.accuracy_pct == null ? '' : ` | แม่นยำ ${item.accuracy_pct.toFixed(1)}%`),
    ),
  ];

  return buildBruReport({
    header: '📐 รายงานความแม่นยำการนับสต็อก',
    bullets,
    footerCount: { label: 'ครั้งที่นับทั้งหมด', count: summary.total_counts },
    maxBullets: 6,
  });
}
