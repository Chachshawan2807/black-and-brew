import { tool } from 'ai';
import { z } from 'zod';
import {
  normalizeShiftLocation,
} from '@/lib/schedule/format-daily-shifts';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';
import { formatScheduleChatResponse } from '@/lib/schedule/format-schedule-chat-response';
import {
  AI_ALLOWED_TABLES,
  fetchTablePreset,
  fetchShiftsByDate,
  fetchSalesSummary,
  fetchInventoryLedger,
  fetchInventorySummary,
  fetchBeanOrdersSummary,
  getRealColumnName,
  TABLE_COLUMN_PRESETS,
} from '@/lib/ai-data-gateway';
import { computeItemsToOrder, type InventoryStockFields } from '@/lib/inventory-stock';

// NOTE (AI-GATEWAY-P3): column presets, aliases, limits, and the Service Role
// client now live in `src/lib/ai-data-gateway.ts` — the single doorway for all
// AI reads. readTableTool below only routes & shapes the response.

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: MAIN TOOL DEFINITION
// ─────────────────────────────────────────────────────────────────────────────
export const readTableTool = tool({
  description: `
สแกนและอ่านข้อมูลจากตารางในฐานข้อมูล Supabase (Universal Read Access)

[ตารางที่อ่านได้ทั้งหมด]
- ตารางงาน: profiles, shifts, holidays, regular_holidays
- คลังสินค้า: inventory_items, inventory_config, inventory_transactions, inventory_count_verifications
- ซ่อมบำรุง: service_records
- ยอดขาย: sales_uploads, sales_records, product_categories
- เมล็ดกาแฟ: bean_customers, bean_customer_addresses, bean_orders, bean_order_lines, bean_order_payments, bean_order_shipments
- ระบบ/ประวัติ: audit_logs, login_history, data_change_logs, revoked_sessions, push_subscriptions, device_passkeys

[คอลัมน์สำคัญ]
- inventory_items: name, stock, order_point, target_stock, order_qty, unit, source, count_policy
- service_records: equipment, start_date, person_in_charge, status, detected_problem
- shifts: employee_id, status, start_time, end_time, metadata (shift_type มาจาก metadata.location)
- sales_records: sale_date, product_name, category, quantity, unit_price, total_amount, payment_method
- bean_orders: order_no, payment_status, fulfillment_status, total_baht, recipient_name
- profiles: full_name, schedule_order, dashboard_order

[สำคัญมาก — กฎการ Query]
1. readTable รองรับเฉพาะ equality filter (eq) เท่านั้น
2. สำหรับ inventory สต็อกต่ำ: ให้ดึงทั้งตาราง (ไม่ต้องส่ง filters) แล้ว filter ใน memory
3. เมื่อถามสรุปภาพรวม: ไม่ควรระบุ limit ต่ำ — ใช้ default ของตาราง
4. ตารางงานรายวัน (วันนี้/พรุ่งนี้): ใช้ getDailyShifts เป็นหลัก ไม่ใช่ readTable shifts
5. ยอดขายช่วงวันที่: ใช้ getSalesSummary แทน dump sales_records
6. คำสั่งซื้อเมล็ด: ใช้ getBeanOrdersSummary เป็นหลัก
`.trim(),

  inputSchema: z.object({
    tableName: z
      .enum(AI_ALLOWED_TABLES)
      .describe(`ชื่อตาราง — อ่านได้ทั้งหมด: ${AI_ALLOWED_TABLES.join(', ')}`),
    columns: z.string().optional().describe(
      'คอลัมน์ที่ต้องการ เช่น "id, name, stock" — ถ้าไม่ระบุจะใช้ preset ของตารางนั้น'
    ),
    filters: z.record(z.string(), z.any()).optional().describe(
      'เงื่อนไข equality filter เท่านั้น เช่น { "status": "active" } — ' +
      'สำหรับ inventory สต็อกต่ำ: ไม่ต้องส่ง filters เลย ให้ดึงทั้งหมดมา filter เอง'
    ),

    // [FIX 3] เปลี่ยน default จาก 50 → ไม่มี default
    // และเปลี่ยน max จาก 100 → 1000
    // เหตุผล: 50 คือค่าที่ทำให้ข้อมูล 27+ รายการหายไปตลอดมา
    // AI ส่วนใหญ่ไม่ได้ระบุ limit อย่างชัดเจน มันจึงใช้ default=50 เสมอ
    limit: z.number().max(1000).optional().describe(
      'จำนวนแถวสูงสุด (ค่า default ขึ้นอยู่กับตาราง: inventory=1000, shifts=500) ' +
      'สำหรับการสรุปภาพรวม ไม่ควรระบุ limit เพื่อดึงข้อมูลครบ 100%'
    ),
  }),

  execute: async ({ tableName, columns, filters, limit }) => {
    try {
      // ─── DEC-069 column-preset enforcement (logging) ──────────────────────
      // readTable runs through the Service Role client (RLS bypass), so the LLM
      // must never pick columns. The gateway forces presets; here we only warn
      // when the model tried to override them, for audit visibility.
      const presetColumns = TABLE_COLUMN_PRESETS[tableName];
      const requestedColumns = (columns ?? '').trim();
      if (
        presetColumns &&
        requestedColumns &&
        requestedColumns !== '*' &&
        requestedColumns !== presetColumns
      ) {
        console.warn(
          `[AI_TOOL] readTable enforced column preset for "${tableName}"; ` +
            `ignored AI-requested columns: ${requestedColumns}`
        );
      }

      const hasFilters = !!filters && Object.keys(filters).length > 0;

      // ─── ROUTE 1: inventory snapshot → preset read + PO-aligned filter ─────
      // Use computeItemsToOrder (same as รายการสั่งซื้อ modal) so AI counts match UI.
      if (tableName === 'inventory_items' && !hasFilters) {
        const result = await fetchTablePreset(tableName, undefined, limit);
        if (!result.ok) {
          return {
            ok: false,
            data: null,
            error: result.error ?? {
              message: 'Failed to read inventory_items',
              details: null,
              hint: null,
            },
          };
        }

        const items = result.rows as InventoryStockFields[];
        const lowStock = computeItemsToOrder(items);
        const sourceBreakdown: Record<string, number> = {};
        lowStock.forEach((item) => {
          const src = (item.source as string | undefined) ?? 'ไม่ระบุช่องทาง';
          sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
        });

        return {
          ok: true,
          row_count: items.length,
          is_complete_dataset: items.length < result.effectiveLimit,
          source: 'ai_data_gateway:computeItemsToOrder',
          data: items,
          low_stock_items: lowStock,
          low_stock_count: lowStock.length,
          source_breakdown: sourceBreakdown,
          total_items: items.length,
        };
      }

      // ─── ROUTE 2: shifts for a specific date → canonical daily formatter ───
      const shiftDateFilter = hasFilters
        ? Object.entries(filters!).find(([key, value]) => {
            const realKey = getRealColumnName('shifts', key);
            return (
              realKey === 'start_time' &&
              typeof value === 'string' &&
              (value as string).length === 10
            );
          })
        : undefined;

      if (tableName === 'shifts' && shiftDateFilter) {
        const date = shiftDateFilter[1] as string;
        const formatted = await fetchShiftsByDate(date);

        return {
          ok: true,
          date,
          source: 'ai_data_gateway:fetchShiftsByDate',
          total_staff: formatted.all_staff.length,
          data: formatted.all_staff.map(({ name, shift, row_order, category }) => ({
            row_order,
            name,
            shift_type: shift,
            category,
          })),
        };
      }

      // ─── ROUTE 3: generic preset-locked read ──────────────────────────────
      const result = await fetchTablePreset(tableName, filters, limit);

      if (!result.ok) {
        return {
          ok: false,
          data: null,
          error: result.error ?? {
            message: `Failed to read ${tableName}`,
            details: null,
            hint: null,
          },
        };
      }

      // Flatten shift metadata.location → shift_type (DEC-068) before strip.
      const rows = result.rows.map((record) => {
        if (tableName !== 'shifts') return record;

        const metadata = record.metadata as { location?: string | null } | null | undefined;
        const status = record.status as string | null | undefined;

        return {
          ...record,
          shift_type: normalizeShiftLocation(metadata?.location ?? undefined, status),
        };
      });

      const responseMeta: Record<string, unknown> = {
        ok: true,
        row_count: rows.length,
        is_complete_dataset: rows.length < result.effectiveLimit,
        data: rows,
      };

      // inventory (with filters): group by purchase channel for AI context.
      if (tableName === 'inventory_items' && rows.length > 0) {
        const sourceBreakdown: Record<string, number> = {};
        rows.forEach((item) => {
          const src = (item as { source?: string }).source ?? 'ไม่ระบุช่องทาง';
          sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
        });
        responseMeta.source_breakdown = sourceBreakdown;
        responseMeta.total_items = rows.length;
      }

      return responseMeta;

    } catch (err: unknown) {
      console.error(`[AI_TOOL] Universal Read crashed:`, err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      const details =
        err && typeof err === 'object' && 'details' in err
          ? (err as { details?: unknown }).details ?? null
          : null;
      return {
        ok: false,
        data: null,
        error: {
          message,
          details,
          hint: null,
        },
      };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Specialized aggregated tools (faster than dumping full tables via readTable)
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesSummaryTool = tool({
  description:
    'สรุปยอดขายตามช่วงวันที่ (รวมยอด, สินค้าขายดี, แยกหมวดหมู่) — ใช้แทนการอ่าน sales_records ทั้งตาราง',
  inputSchema: z.object({
    fromDate: z.string().describe('วันเริ่มต้น YYYY-MM-DD'),
    toDate: z.string().describe('วันสิ้นสุด YYYY-MM-DD'),
    topN: z.number().min(1).max(20).optional().describe('จำนวนสินค้าขายดี (default 10)'),
  }),
  execute: async ({ fromDate, toDate, topN }) => {
    try {
      return await fetchSalesSummary({ fromDate, toDate, topN });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, error: { message, details: null, hint: null } };
    }
  },
});

export const getInventoryLedgerTool = tool({
  description:
    'ดึงประวัติเคลื่อนไหวสต็อก (IN/OUT) พร้อมชื่อสินค้า — ใช้แทนการ join inventory_transactions เอง',
  inputSchema: z.object({
    itemName: z.string().optional().describe('กรองชื่อสินค้า (substring)'),
    days: z.number().min(1).max(90).optional().describe('ย้อนหลังกี่วัน (default 14)'),
    limit: z.number().min(1).max(200).optional(),
  }),
  execute: async ({ itemName, days, limit }) => {
    try {
      return await fetchInventoryLedger({ itemName, days, limit });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, error: { message, details: null, hint: null } };
    }
  },
});

export const getStoreStatusTool = tool({
  description:
    'ภาพรวมร้านวันนี้: กะงาน + สรุปสต็อก + รายการสต็อกต่ำ (RPC get_ai_store_status)',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const status = await fetchInventorySummary();
      return { ok: true, ...status };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, error: { message, details: null, hint: null } };
    }
  },
});

export const getBeanOrdersSummaryTool = tool({
  description:
    'สรุปคำสั่งซื้อเมล็ดกาแฟที่เปิดอยู่ (ค้างชำระ / รอจัดส่ง) ในช่วงวันล่าสุด',
  inputSchema: z.object({
    days: z.number().min(1).max(90).optional().describe('ย้อนหลังกี่วัน (default 30)'),
  }),
  execute: async ({ days }) => {
    try {
      return await fetchBeanOrdersSummary({ days });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { ok: false, error: { message, details: null, hint: null } };
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// getDailyShiftsTool — ไม่มีการเปลี่ยนแปลง logic หลัก
// เพิ่มเพียง type safety และ error handling ที่ดีขึ้น
// ─────────────────────────────────────────────────────────────────────────────
export const getDailyShiftsTool = tool({
  description: `
ดึงตารางงานพนักงานทุกคนในวันที่ระบุ (YYYY-MM-DD) แบบจัดกลุ่มพร้อมใช้งาน

[กะที่มีในระบบเท่านั้น]
- เวลาเข้างานหน้าร้าน: 6:30, 7:00, 8:00
- งานอื่น: ไปสาขา 2, ร้านซักผ้า
- ไม่ทำงาน: วันหยุด (ว่าง), ลา

[สำคัญ]
- ใช้ tool นี้เป็นหลักเมื่อถามตารางงานรายวัน (วันนี้/พรุ่งนี้/วันที่ระบุ)
- ห้ามใช้ start_time/end_time เป็นเวลาเข้างาน (ค่าเหล่านั้นเป็นวันที่ล้วน)
- ข้อมูล shift มาจาก metadata.location ใน Supabase แล้วถูก normalize ให้แล้ว
`.trim(),
  inputSchema: z.object({
    date: z.string().describe('วันที่ต้องการดูตารางงาน รูปแบบ YYYY-MM-DD เช่น 2026-06-08'),
  }),
  execute: async ({ date }) => {
    try {
      const formatted = await fetchDailyShiftsByDate(date);
      const formattedText = formatScheduleChatResponse(date, formatted);

      return {
        ok: true,
        date,
        total_staff: formatted.all_staff.length,
        formatted_text: formattedText,
        valid_shift_types: ['6:30', '7:00', '8:00', 'วันหยุด', 'ลา', 'ไปสาขา 2', 'ร้านซักผ้า'],
        front_store: formatted.front_store.map(({ name, shift, row_order }) => ({
          row_order,
          name,
          shift,
        })),
        other_duty: formatted.other_duty.map(({ name, shift, row_order }) => ({
          row_order,
          name,
          shift,
        })),
        off_or_leave: formatted.off_or_leave.map(({ name, shift, row_order }) => ({
          row_order,
          name,
          shift,
        })),
        all_staff: formatted.all_staff.map(({ name, shift, row_order, category }) => ({
          row_order,
          name,
          shift,
          category,
        })),
      };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        ok: false,
        data: null,
        error: {
          message,
          details: null,
          hint: null,
        },
      };
    }
  },
});