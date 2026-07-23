import { buildBruReport } from '@/lib/agents/report-response';
import type { StoreStatus } from '@/lib/ai-data-gateway';

export function formatStoreStatusChatResponse(status: StoreStatus): string {
  const lowCount = status.low_stock_items?.length ?? 0;
  const shiftCount = Array.isArray(status.shifts) ? status.shifts.length : 0;

  const bullets = [
    `พนักงานเข้ากะวันนี้: ${shiftCount} รายการ`,
    `สินค้าสต็อกต่ำ: ${lowCount} รายการ`,
  ];

  if (lowCount > 0) {
    const names = (status.low_stock_items ?? [])
      .slice(0, 3)
      .map((item) => String((item as { name?: string }).name ?? 'ไม่ระบุ'));
    bullets.push(`เร่งด่วน: ${names.join(', ')}`);
  }

  return buildBruReport({
    header: '🏪 สถานะร้านวันนี้',
    bullets,
    footerCount: { label: 'จุดที่ควรติดตาม', count: lowCount + (shiftCount === 0 ? 1 : 0) },
  });
}
