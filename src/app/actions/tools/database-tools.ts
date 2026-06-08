import { tool } from 'ai';
import { z } from 'zod';
import {
  normalizeShiftLocation,
} from '@/lib/schedule/format-daily-shifts';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';
import { formatScheduleChatResponse } from '@/lib/schedule/format-schedule-chat-response';
import {
  fetchTablePreset,
  fetchInventorySummary,
  fetchShiftsByDate,
  getRealColumnName,
  TABLE_COLUMN_PRESETS,
} from '@/lib/ai-data-gateway';

// NOTE (AI-GATEWAY-P3): column presets, aliases, limits, and the Service Role
// client now live in `src/lib/ai-data-gateway.ts` — the single doorway for all
// AI reads. readTableTool below only routes & shapes the response.

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: MAIN TOOL DEFINITION
// ─────────────────────────────────────────────────────────────────────────────
export const readTableTool = tool({
  description: `
สแกนและอ่านข้อมูลจากตารางในฐานข้อมูล (Universal Read Access)

[คอลัมน์จริงที่ใช้ได้]
- inventory_items: name, stock, order_point, target_stock, order_qty, unit, source
  (source = ช่องทางสั่งซื้อ เช่น "Makro", "Line", "สาขา 2", "สั่งพี่ต้า")
- service_records: equipment, start_date, person_in_charge, status, detected_problem
- shifts: start_time, end_time, status, employee_id, shift_type (shift_type = กะจริงจาก metadata.location เช่น 6:30, 7:00, 8:00, ลา, ไปสาขา 2, ร้านซักผ้า, วันหยุด — ห้ามใช้ start_time เป็นเวลาเข้างาน)
- profiles: full_name, schedule_order
- holidays: date, name

[สำคัญมาก — กฎการ Query]
1. readTable รองรับเฉพาะ equality filter (eq) เท่านั้น
2. สำหรับ inventory สต็อกต่ำ: ให้ดึงทั้งตาราง (ไม่ต้องส่ง filters) แล้ว filter ใน memory
3. เมื่อถามสรุปสินค้าทั้งหมด: ต้องดึง "ทุกแถว" ไม่ควรระบุ limit ต่ำ
4. ข้อมูลจะถูกจัดกลุ่มตาม source อัตโนมัติ ใช้ source เพื่อแยกช่องทางการสั่งซื้อ
`.trim(),

  inputSchema: z.object({
    tableName: z
      .enum([
        'shifts',
        'profiles',
        'holidays',
        'inventory_items',
        'service_records',
        'inventory_transactions',
      ])
      .describe(
        'ชื่อตาราง: shifts, profiles, holidays, inventory_items, service_records, inventory_transactions'
      ),
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

      // ─── ROUTE 1: inventory snapshot → AI Data Gateway store status ────────
      // "สรุปสต็อกทั้งหมด" with no filters routes to get_ai_store_status, which
      // returns DB-computed LOW/WARNING/OK status (sql/ai_agent_views.sql).
      if (tableName === 'inventory_items' && !hasFilters) {
        const status = await fetchInventorySummary();
        const inventory = status.inventory_summary ?? [];
        const lowStock = status.low_stock_items ?? [];

        return {
          ok: true,
          row_count: inventory.length,
          is_complete_dataset: true,
          source: 'ai_data_gateway:get_ai_store_status',
          data: inventory,
          low_stock_items: lowStock,
          low_stock_count: lowStock.length,
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

    } catch (err: any) {
      console.error(`[AI_TOOL] Universal Read crashed:`, err);
      return {
        ok: false,
        data: null,
        error: {
          message: err?.message || 'Unknown error',
          details: err?.details ?? null,
          hint: null,
        },
      };
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