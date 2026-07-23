import { describe, expect, test } from 'vitest';
import { isSalesSummaryQuery, resolveSalesDateRange } from '@/lib/agents/detect-sales-query';
import { isUpcomingHolidaysQuery } from '@/lib/agents/detect-holidays-query';
import { isLowStockQuery } from '@/lib/agents/detect-low-stock-query';
import { isStoreStatusQuery } from '@/lib/agents/detect-store-status-query';
import { isBeanOrdersSummaryQuery } from '@/lib/agents/detect-bean-orders-query';
import { isInventoryAccuracyQuery } from '@/lib/agents/detect-inventory-accuracy-query';
import { formatSalesChatResponse } from '@/lib/agents/format-sales-chat-response';
import { formatHolidaysChatResponse } from '@/lib/agents/format-holidays-chat-response';
import { formatLowStockChatResponse } from '@/lib/agents/format-low-stock-chat-response';
import { formatStoreStatusChatResponse } from '@/lib/agents/format-store-status-chat-response';
import { formatBeanOrdersChatResponse } from '@/lib/agents/format-bean-orders-chat-response';
import { formatInventoryAccuracyChatResponse } from '@/lib/agents/format-inventory-accuracy-chat-response';

describe('deterministic query detectors', () => {
  test('detects sales summary queries and date ranges', () => {
    expect(isSalesSummaryQuery('สรุปยอดขายสัปดาห์นี้')).toBe(true);
    expect(isSalesSummaryQuery('ตารางงานพรุ่งนี้')).toBe(false);
    const range = resolveSalesDateRange('ยอดขายวันนี้', '2026-07-23');
    expect(range.fromDate).toBe('2026-07-23');
    expect(range.toDate).toBe('2026-07-23');
  });

  test('detects holidays, low stock, store status, bean orders, accuracy', () => {
    expect(isUpcomingHolidaysQuery('วันหยุดนักขัตฤกษ์ใกล้ๆ นี้')).toBe(true);
    expect(isLowStockQuery('สินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ')).toBe(true);
    expect(isStoreStatusQuery('วันนี้ร้านเป็นยังไง')).toBe(true);
    expect(isBeanOrdersSummaryQuery('คำสั่งซื้อเมล็ดกาแฟค้างชำระ')).toBe(true);
    expect(isInventoryAccuracyQuery('รายงานความแม่นยำการนับสต็อก')).toBe(true);
  });
});

describe('deterministic formatters', () => {
  test('formats sales summary as Bru report', () => {
    const text = formatSalesChatResponse({
      from_date: '2026-07-01',
      to_date: '2026-07-23',
      total_amount: 15000,
      total_quantity: 120,
      top_products: [
        { product_name: 'ลาเต้', category: 'เครื่องดื่ม', quantity: 40, total_amount: 6000 },
      ],
      category_breakdown: [{ category: 'เครื่องดื่ม', quantity: 100, total_amount: 12000 }],
      row_count: 50,
      is_complete_dataset: true,
      ok: true,
    });
    expect(text).toContain('ยอดขาย');
    expect(text).toContain('15,000');
    expect(text).toMatch(/ค่ะ$/m);
    expect(text).not.toContain('**');
  });

  test('formats holidays, low stock, store status, bean orders, accuracy', () => {
    expect(
      formatHolidaysChatResponse('2026-07-23', [
        { date: '2026-08-12', name: 'วันแม่แห่งชาติ' },
      ]),
    ).toContain('วันแม่แห่งชาติ');

    expect(
      formatLowStockChatResponse([
        {
          name: 'นมสด',
          stock: 2,
          order_point: 5,
          target_stock: 12,
          order_qty: 10,
          unit: 'ลิตร',
          source: 'Makro',
        },
      ]),
    ).toContain('นมสด');

    expect(
      formatStoreStatusChatResponse({
        low_stock_items: [{ name: 'Beans' }],
        shifts: [{ employee_name: 'นิต้า' }],
      }),
    ).toContain('สถานะร้าน');

    expect(
      formatBeanOrdersChatResponse({
        ok: true,
        days: 30,
        total_orders: 3,
        unpaid_count: 1,
        pending_ship_count: 2,
        unpaid_total_baht: 1200,
        open_orders: [
          {
            order_no: 'BO-001',
            recipient_name: 'คุณเอ',
            total_baht: 1200,
            payment_status: 'unpaid',
            fulfillment_status: 'pending',
            created_at: '2026-07-20T00:00:00Z',
          },
        ],
      }),
    ).toContain('BO-001');

    expect(
      formatInventoryAccuracyChatResponse({
        ok: true,
        overall_accuracy_pct: 92.5,
        matched_count: 80,
        mismatched_count: 8,
        total_counts: 88,
        high_discrepancy_items: [
          { item_name: 'น้ำตาล', total_discrepancy_qty: 12, accuracy_pct: 70 },
        ],
      }),
    ).toContain('92.5');
  });
});
