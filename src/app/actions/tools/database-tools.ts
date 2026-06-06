import { createClient } from '@supabase/supabase-js';
import { tool } from 'ai';
import { z } from 'zod';
import {
  normalizeShiftLocation,
} from '@/lib/schedule/format-daily-shifts';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';
import { formatScheduleChatResponse } from '@/lib/schedule/format-schedule-chat-response';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ [DatabaseTool] Missing Supabase Service Role configuration.');
}

const adminClient = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: COLUMN ALIASES (ไม่เปลี่ยน — ดีอยู่แล้ว)
// ─────────────────────────────────────────────────────────────────────────────
const COLUMN_ALIASES: Record<string, Record<string, string>> = {
  inventory_items: {
    item_name: 'name',
    quantity: 'stock',
    min_stock: 'order_point',
  },
  service_records: {
    machine_name: 'equipment',
    maintenance_date: 'start_date',
    recorded_at: 'start_date',
    operator: 'person_in_charge',
    description: 'work_details',
  },
  shifts: {
    shift_date: 'start_time',
    date: 'start_time',
    employee: 'employee_id'
  },
  profiles: { name: 'full_name' },
  holidays: { holiday_date: 'date', holiday_name: 'name' }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: TABLE PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const TABLE_COLUMN_PRESETS: Record<string, string> = {
  profiles: 'id, full_name, schedule_order',
  shifts: 'id, employee_id, status, start_time, end_time, metadata',
  holidays: 'id, date, name',

  // [FIX 1] เพิ่ม source กลับเข้ามาและยืนยันว่าครบทุก field ที่จำเป็น
  // source = ช่องทางการสั่งซื้อ (เช่น "Makro", "Line", "สาขา 2", "สั่งพี่ต้า")
  // หากไม่ดึง source มา AI จะไม่รู้ว่าแต่ละรายการต้องสั่งผ่านช่องทางไหน
  inventory_items: 'id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at',

  inventory_transactions: 'id, inventory_item_id, type, quantity, note, created_at',
  service_records:
    'id, start_date, equipment, detected_problem, task_type, work_details, ' +
    'cost, recommended_frequency, person_in_charge, status, completion_date, notes',
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: HELPER FUNCTIONS (ไม่เปลี่ยน — ดีอยู่แล้ว)
// ─────────────────────────────────────────────────────────────────────────────
function getRealColumnName(tableName: string, col: string): string {
  return COLUMN_ALIASES[tableName]?.[col] ?? col;
}

function normalizeColumns(tableName: string, columns: string): string {
  return columns
    .split(',')
    .map(col => col.trim())
    .filter(Boolean)
    .map(col => getRealColumnName(tableName, col))
    .join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: TABLE-SPECIFIC LIMITS
//
// [FIX 2] แทนที่จะให้ AI ส่ง limit มาเอง (ซึ่งมักจะ default เป็น 50)
// เราตั้ง "safe maximum" แยกตามตาราง
//
// ทำไมถึงไม่ใช้ Number.MAX_SAFE_INTEGER?
// เพราะ Supabase มี limit ของตัวเองอยู่ที่ 1,000 แถวต่อ request
// การส่งค่าเกินกว่านั้นไม่มีความหมาย และอาจทำให้ Supabase ignore limit ทิ้ง
// ซึ่งอาจ fallback เป็น default ของ Supabase (1,000) โดยอัตโนมัติ
// → การตั้งค่า 1000 จึงชัดเจน ควบคุมได้ และสื่อความหมายตรงไปตรงมา
// ─────────────────────────────────────────────────────────────────────────────
const TABLE_MAX_LIMITS: Record<string, number> = {
  inventory_items: 1000,      // ร้านกาแฟมีรายการสินค้าไม่เกินหลายร้อย ดึงมาทั้งหมดเลย
  service_records: 1000,      // ประวัติซ่อมบำรุงก็เช่นกัน
  profiles: 200,              // พนักงานมีจำนวนจำกัด
  shifts: 500,                // กะงาน 1 เดือน ≈ 30วัน × 10คน = 300 แถว
  holidays: 366,              // วันหยุด 1 ปีมีไม่เกิน 366 วัน
  inventory_transactions: 500,
};

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
      // ─── คำนวณ effectiveLimit ─────────────────────────────────────────────
      //
      // Priority order:
      //   1. ถ้า AI ระบุ limit มาอย่างชัดเจน → ใช้ค่านั้น (AI รู้ว่าต้องการเท่าไหร่)
      //   2. ถ้าไม่ระบุ → ดู TABLE_MAX_LIMITS ของตารางนั้น
      //   3. ถ้าไม่มีใน TABLE_MAX_LIMITS → ใช้ 200 เป็น fallback ที่ปลอดภัย
      //
      // [เหตุผลที่ไม่ใช้ default=50 อีกต่อไป]
      // AI มักไม่ระบุ limit เวลาถามภาพรวม เช่น "สรุปสต็อกทั้งหมด"
      // default=50 จึงทำให้ข้อมูล 27 รายการออกมาแค่ 9 เพราะดึงมาแค่ 50 แถว
      // แล้วหลังจาก filter ใน-memory เหลือแค่ที่ stock < order_point = 9 ตัว
      // ──────────────────────────────────────────────────────────────────────
      const effectiveLimit = limit ?? TABLE_MAX_LIMITS[tableName] ?? 200;

      // ─── เลือกคอลัมน์ ────────────────────────────────────────────────────
      const normalizedColumns = (columns ?? '').trim();
      const shouldUsePreset = !normalizedColumns || normalizedColumns === '*';
      const presetColumns = TABLE_COLUMN_PRESETS[tableName];
      if (shouldUsePreset && !presetColumns) {
        return {
          ok: false,
          data: null,
          error: {
            message: `No column preset defined for table: ${tableName}`,
            details: null,
            hint: 'Use an allowed tableName from the enum list.',
          },
        };
      }

      let selectedColumns = shouldUsePreset
        ? presetColumns!
        : normalizeColumns(tableName, normalizedColumns);

      // ─── Build Supabase query ─────────────────────────────────────────────
      let query = adminClient
        .from(tableName)
        .select(selectedColumns)
        .limit(effectiveLimit);

      // ─── Apply filters ────────────────────────────────────────────────────
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          const realKey = getRealColumnName(tableName, key);

          // Special case: date range filter สำหรับ shifts
          if (
            tableName === 'shifts' &&
            realKey === 'start_time' &&
            typeof value === 'string' &&
            value.length === 10
          ) {
            query = query
              .gte('start_time', `${value}T00:00:00`)
              .lte('start_time', `${value}T23:59:59`);
          } else {
            query = query.eq(realKey, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[AI_TOOL] Error reading ${tableName}:`, error);
        return {
          ok: false,
          data: null,
          error: {
            message: error.message,
            details: error.details,
            hint: (error as any).hint ?? null,
          },
        };
      }

      // ─── [FIX 4] ส่งกลับ metadata เพิ่มเติมเพื่อให้ AI มีบริบทมากขึ้น ──
      //
      // เดิม: return { ok: true, data: data ?? [] }
      // ใหม่: บอก AI ด้วยว่าดึงมากี่แถว และมี source อะไรบ้าง (เฉพาะ inventory)
      // ทำไม? เพราะถ้า rowCount < effectiveLimit แปลว่าดึงมาครบแล้ว 100%
      // แต่ถ้า rowCount === effectiveLimit อาจมีข้อมูลมากกว่านี้ → AI จะรู้ว่าต้องแจ้งเตือน
      const rows = (data ?? []).map((row) => {
        const record = row as unknown as Record<string, unknown>;
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
        // บอก AI ว่าดึงข้อมูลครบหรือยัง
        is_complete_dataset: rows.length < effectiveLimit,
        data: rows,
      };

      // เฉพาะ inventory_items: บอก AI ว่ามี source อะไรบ้างและแต่ละ source มีกี่ items
      // ข้อมูลนี้ช่วยให้ AI ตอบได้ว่า "27 รายการ แบ่งเป็น Makro 7, Line 3, ..."
      if (tableName === 'inventory_items' && rows.length > 0) {
        const sourceBreakdown: Record<string, number> = {};
        rows.forEach((item: any) => {
          const src = item.source ?? 'ไม่ระบุช่องทาง';
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