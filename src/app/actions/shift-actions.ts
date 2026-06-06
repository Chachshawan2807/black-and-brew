'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { assertWritableSession } from '@/app/actions/auth';

// กำหนด Admin Client เพื่อทะลวง RLS สำหรับระบบที่ใช้ PIN Auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // บังคับใช้ Service Role เท่านั้นเพื่อความปลอดภัยของข้อมูล
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

export async function deleteShift(id: string) {
  if (!id) return { success: false, error: 'Missing shift ID' };
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

    const { error } = await supabaseAdmin.from('shifts').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidateAppPaths();
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

export async function updateStaffOrder(orderedIds: string[]) {
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

    const updates = orderedIds.map((id, index) =>
      supabaseAdmin.from('profiles').update({ schedule_order: index, display_order: index }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) return { success: false, error: firstError.error?.message || 'Unknown error' };

    revalidatePath('/[locale]/schedule', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDashboardOrder(orderedIds: string[]) {
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

    const updates = orderedIds.map((id, index) =>
      supabaseAdmin.from('profiles').update({ dashboard_order: index }).eq('id', id)
    );
    await Promise.all(updates);
    revalidatePath('/[locale]/dashboard', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function revalidateAppPaths() {
  revalidatePath('/', 'layout');
  revalidatePath('/[locale]/schedule', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
}

const shiftSchema = z.object({
  id: z.string().optional(),
  employee_id: z.string(),
  start_time: z.string(),
  end_time: z.string().optional(),
  status: z.string(),
  metadata: z.any().optional()
});

export async function saveShift(payload: any) {
  noStore();

  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (!pinVerified && (!user || authError)) {
    return { success: false, error: 'Unauthorized: Session missing or invalid' };
  }

  const writable = await assertWritableSession();
  if (!writable.ok) return { success: false, error: writable.error };

  const parsed = shiftSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid payload structure' };
  }

  const datePart = parsed.data.start_time.split('T')[0];
  const cleanStartTime = datePart + 'T00:00:00';
  const cleanEndTime = datePart + 'T23:59:59';

  try {
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .upsert({
        id: payload.id || undefined,
        employee_id: payload.employee_id,
        start_time: cleanStartTime,
        end_time: cleanEndTime,
        status: payload.status,
        metadata: payload.metadata
      }, { onConflict: 'employee_id,start_time' })
      .select()
      .single();

    if (error) {
      console.error('[saveShift] Upsert Error:', error);
      return { success: false, error: error.message };
    }

    revalidateAppPaths();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteManagementHistoryRange(employeeId: string, startDate: string, endDate: string) {
  if (!employeeId || !startDate || !endDate) return { success: false, error: 'Missing parameters' };
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('employee_id', employeeId)
      .eq('metadata->is_management', true)
      .gte('start_time', `${startDate.split('T')[0]}T00:00:00`)
      .lte('start_time', `${endDate.split('T')[0]}T23:59:59`);

    if (error) {
      console.error('[deleteManagementHistoryRange] Supabase Error:', error.message, error);
      throw error;
    }

    revalidateAppPaths();
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

/**
 * ดึงข้อมูลกะงานและโปรไฟล์พนักงานสำหรับช่วงวันที่กำหนดแบบยืดหยุ่น (Server-side)
 * @param startDate วันที่เริ่มต้น YYYY-MM-DD
 * @param endDate วันที่สิ้นสุด YYYY-MM-DD
 */
export async function fetchRosterData(startDate: string, endDate: string) {
  try {
    const [profilesRes, shiftsRes, holidaysRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, dashboard_order')
        .order('dashboard_order', { ascending: true }), // แก้ไขให้ใช้ระเบียบ dashboard_order พนักงานจะได้ขึ้นครบทุกคน
      supabaseAdmin
        .from('shifts')
        .select('id, employee_id, status, metadata, start_time, end_time')
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`),
      supabaseAdmin
        .from('holidays')
        .select('id, date, name')
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (shiftsRes.error) throw shiftsRes.error;
    if (holidaysRes.error) throw holidaysRes.error;

    return {
      success: true,
      profiles: profilesRes.data || [],
      shifts: shiftsRes.data || [],
      holidays: holidaysRes.data || []
    };
  } catch (error: any) {
    console.error('[fetchRosterData] Error:', error.message || error);
    return { success: false, profiles: [], shifts: [], holidays: [], error: error.message || 'Internal Server Error' };
  }
}

/**
 * คัดลอกตารางงานจากสัปดาห์หนึ่งไปยังอีกสัปดาห์หนึ่ง
 * บังคับใช้ Atomic Weekly Flush Protocol (DEC-047)
 */
export async function copyWeeklyShifts(sourceStartDate: string, targetStartDate: string) {
  noStore();
  const cookieStore = await cookies();
  const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

  if (!pinVerified) {
    return { success: false, error: 'Unauthorized: โปรดเข้าสู่ระบบด้วย PIN' };
  }

  const writable = await assertWritableSession();
  if (!writable.ok) return { success: false, error: writable.error };

  try {
    const sStart = sourceStartDate.split('T')[0];
    const tStart = targetStartDate.split('T')[0];

    // 1. คำนวณวันสิ้นสุดของสัปดาห์เป้าหมาย (7 วัน)
    const targetEndDate = new Date(tStart);
    targetEndDate.setDate(targetEndDate.getDate() + 6);
    const tEnd = targetEndDate.toISOString().split('T')[0];

    // 2. ATOMIC FLUSH: ลบข้อมูลเก่าในสัปดาห์เป้าหมายทิ้งทั้งหมดก่อน เพื่อป้องกัน Conflict 409
    // นี่คือวิธีที่ปลอดภัยที่สุดเพื่อให้แน่ใจว่าไม่มีข้อมูลใด (เช่น วันลา) มาขวางการคัดลอก
    const { error: deleteError } = await supabaseAdmin
      .from('shifts')
      .delete()
      .gte('start_time', `${tStart}T00:00:00`)
      .lte('start_time', `${tEnd}T23:59:59`);

    if (deleteError) {
      console.error('[copyWeeklyShifts] Delete Error:', deleteError);
      throw deleteError;
    }

    // 3. ดึงข้อมูลจากสัปดาห์ต้นทาง
    const sourceEndDate = new Date(sStart);
    sourceEndDate.setDate(sourceEndDate.getDate() + 6);
    const sEnd = sourceEndDate.toISOString().split('T')[0];

    const { data: sourceShifts, error: fetchError } = await supabaseAdmin
      .from('shifts')
      .select('employee_id, status, metadata, start_time')
      .gte('start_time', `${sStart}T00:00:00`)
      .lte('start_time', `${sEnd}T23:59:59`);

    if (fetchError) throw fetchError;
    if (!sourceShifts || sourceShifts.length === 0) {
      return { success: true, message: 'ไม่มีข้อมูลกะงานในสัปดาห์ก่อนหน้าที่จะคัดลอก' };
    }

    // 3.1 DEDUPLICATION: กรองข้อมูลต้นทางให้เหลือ 1 คนต่อ 1 วันเท่านั้น เพื่อป้องกัน Error 409 Conflict
    const uniqueShiftsMap = new Map();
    sourceShifts.forEach(shift => {
      const dateOnly = shift.start_time.split('T')[0];
      const key = `${shift.employee_id}_${dateOnly}`;
      // เก็บเฉพาะรายการล่าสุดหากมีความซ้ำซ้อนในสัปดาห์ต้นทาง
      uniqueShiftsMap.set(key, shift);
    });
    const deduplicatedSourceShifts = Array.from(uniqueShiftsMap.values());

    // 4. แปลงข้อมูลวันที่จากต้นทางไปปลายทาง (Day-to-Day Mapping)
    const sourceBase = new Date(sStart).getTime();
    const targetBase = new Date(tStart);

    const newShifts = deduplicatedSourceShifts.map(shift => {
      const currentShiftDate = new Date(shift.start_time.split('T')[0]).getTime();
      const dayOffset = Math.round((currentShiftDate - sourceBase) / (1000 * 60 * 60 * 24));
      
      const newDate = new Date(targetBase);
      newDate.setDate(targetBase.getDate() + dayOffset);
      const newDateStr = newDate.toISOString().split('T')[0];

      return {
        employee_id: shift.employee_id,
        status: shift.status,
        metadata: shift.metadata,
        start_time: `${newDateStr}T00:00:00`,
        end_time: `${newDateStr}T23:59:59`
      };
    });

    // 5. บันทึกข้อมูลใหม่แบบ Bulk Insert (เนื่องจากเราล้างข้อมูลเป้าหมายไปแล้วในขั้นตอนที่ 2)
    const { error: insertError } = await supabaseAdmin
      .from('shifts')
      .insert(newShifts);

    if (insertError) {
      console.error('[copyWeeklyShifts] Insert Error:', insertError);
      throw insertError;
    }

    revalidateAppPaths();
    return { success: true };
  } catch (err: any) {
    console.error('[copyWeeklyShifts] CRITICAL FAILURE:', err);
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดรุนแรงในการคัดลอกข้อมูล' };
  }
}