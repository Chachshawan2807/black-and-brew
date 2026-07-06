'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { assertWritableSession } from '@/app/actions/auth';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { ensureServerSession } from '@/lib/security/server-auth';

// กำหนด Admin Client เพื่อทะลวง RLS สำหรับระบบที่ใช้ PIN Auth
import { requireServiceRoleKey } from '@/lib/security/server-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(supabaseUrl, requireServiceRoleKey());

const shiftIdSchema = z.string().uuid();

async function ensureShiftMutationAuthorized(): Promise<string | null> {
  const auth = await ensureServerSession();
  if (!auth.ok) return auth.error;
  const writable = await assertWritableSession();
  if (!writable.ok) return writable.error;
  return null;
}

export async function deleteShift(id: string) {
  const parsedId = shiftIdSchema.safeParse(id);
  if (!parsedId.success) return { success: false, error: 'Invalid shift ID' };
  try {
    const authError = await ensureShiftMutationAuthorized();
    if (authError) return { success: false, error: authError };

    const shiftId = parsedId.data;
    const { data: shiftBefore } = await supabaseAdmin
      .from('shifts')
      .select('id, employee_id, start_time, status, metadata')
      .eq('id', shiftId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from('shifts').delete().eq('id', shiftId);
    if (error) {
      await recordDataChange({
        action: 'DELETE',
        module: 'schedule',
        entityType: 'shift',
        entityId: shiftId,
        oldValue: shiftBefore ?? null,
        status: 'failed',
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'DELETE',
      module: 'schedule',
      entityType: 'shift',
      entityId: shiftId,
      oldValue: shiftBefore ?? null,
    });

    revalidateAppPaths();
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

export async function batchUpdateProfileNames(updates: { id: string; full_name: string }[]) {
  if (!updates || updates.length === 0) return { success: true };
  try {
    const authError = await ensureShiftMutationAuthorized();
    if (authError) return { success: false, error: authError };

    const ids = updates.map((u) => u.id);
    const { data: beforeProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', ids);

    const beforeById = new Map((beforeProfiles ?? []).map((p) => [p.id, p.full_name]));

    const results = await Promise.all(
      updates.map((u) =>
        supabaseAdmin.from('profiles').update({ full_name: u.full_name }).eq('id', u.id)
      )
    );
    const firstError = results.find((r) => r.error);
    if (firstError) {
      await recordDataChange({
        action: 'BULK_UPDATE',
        module: 'schedule',
        entityType: 'profile',
        status: 'failed',
        errorMessage: firstError.error?.message || 'Unknown error',
        metadata: { operation: 'batch_update_profile_names', count: updates.length },
      });
      return { success: false, error: firstError.error?.message || 'Unknown error' };
    }

    const nameChanges = updates
      .filter((u) => (beforeById.get(u.id) ?? '') !== u.full_name)
      .map((u) => ({
        label: beforeById.get(u.id) || u.full_name,
        old_value: beforeById.get(u.id) ?? null,
        new_value: u.full_name,
      }));

    await recordDataChange({
      action: 'BULK_UPDATE',
      module: 'schedule',
      entityType: 'profile',
      metadata: {
        operation: 'batch_update_profile_names',
        count: updates.length,
        nameChanges,
      },
    });

    revalidatePath('/[locale]/schedule', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateStaffOrder(orderedIds: string[]) {
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };
  try {
    const authError = await ensureShiftMutationAuthorized();
    if (authError) return { success: false, error: authError };

    const updates = orderedIds.map((id, index) =>
      supabaseAdmin.from('profiles').update({ schedule_order: index, display_order: index }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) {
      await recordDataChange({
        action: 'BULK_UPDATE',
        module: 'schedule',
        entityType: 'profile',
        status: 'failed',
        errorMessage: firstError.error?.message || 'Unknown error',
        metadata: { operation: 'update_staff_order', orderedIds },
      });
      return { success: false, error: firstError.error?.message || 'Unknown error' };
    }

    await recordDataChange({
      action: 'BULK_UPDATE',
      module: 'schedule',
      entityType: 'profile',
      metadata: { operation: 'update_staff_order', orderedIds },
    });

    revalidatePath('/[locale]/schedule', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDashboardOrder(orderedIds: string[]) {
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };
  try {
    const authError = await ensureShiftMutationAuthorized();
    if (authError) return { success: false, error: authError };

    const updates = orderedIds.map((id, index) =>
      supabaseAdmin.from('profiles').update({ dashboard_order: index }).eq('id', id)
    );
    await Promise.all(updates);

    await recordDataChange({
      action: 'BULK_UPDATE',
      module: 'dashboard',
      entityType: 'profile',
      metadata: { operation: 'update_dashboard_order', orderedIds },
    });

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
  metadata: z.record(z.string(), z.unknown()).optional()
});

type ShiftPayload = z.infer<typeof shiftSchema>;

export async function saveShift(payload: ShiftPayload) {
  noStore();

  const authError = await ensureShiftMutationAuthorized();
  if (authError) return { success: false, error: authError };

  const parsed = shiftSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid payload structure' };
  }

  const datePart = parsed.data.start_time.split('T')[0];
  const cleanStartTime = datePart + 'T00:00:00';
  const cleanEndTime = datePart + 'T23:59:59';

  try {
    const isUpdate = Boolean(payload.id);
    let shiftBefore = null;
    if (isUpdate) {
      const { data: existing } = await supabaseAdmin
        .from('shifts')
        .select('id, employee_id, start_time, status, metadata')
        .eq('id', payload.id)
        .maybeSingle();
      shiftBefore = existing;
    }

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
      await recordDataChange({
        action: isUpdate ? 'UPDATE' : 'CREATE',
        module: 'schedule',
        entityType: 'shift',
        entityId: payload.id ?? null,
        oldValue: shiftBefore,
        newValue: payload,
        status: 'failed',
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: isUpdate ? 'UPDATE' : 'CREATE',
      module: 'schedule',
      entityType: 'shift',
      entityId: data?.id ?? payload.id ?? null,
      oldValue: shiftBefore,
      newValue: data ?? payload,
    });

    revalidateAppPaths();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteManagementHistoryRange(employeeId: string, startDate: string, endDate: string) {
  if (!employeeId || !startDate || !endDate) return { success: false, error: 'Missing parameters' };
  try {
    const authError = await ensureShiftMutationAuthorized();
    if (authError) return { success: false, error: authError };

    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('employee_id', employeeId)
      .eq('metadata->is_management', true)
      .gte('start_time', `${startDate.split('T')[0]}T00:00:00`)
      .lte('start_time', `${endDate.split('T')[0]}T23:59:59`);

    if (error) {
      console.error('[deleteManagementHistoryRange] Supabase Error:', error.message, error);
      await recordDataChange({
        action: 'BULK_DELETE',
        module: 'schedule',
        entityType: 'shift',
        status: 'failed',
        errorMessage: error.message,
        metadata: { employeeId, startDate, endDate, operation: 'delete_management_history' },
      });
      throw error;
    }

    await recordDataChange({
      action: 'BULK_DELETE',
      module: 'schedule',
      entityType: 'shift',
      metadata: { employeeId, startDate, endDate, operation: 'delete_management_history' },
    });

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[fetchRosterData] Error:', message);
    return { success: false, profiles: [], shifts: [], holidays: [], error: message };
  }
}

/**
 * คัดลอกตารางงานจากสัปดาห์หนึ่งไปยังอีกสัปดาห์หนึ่ง
 * บังคับใช้ Atomic Weekly Flush Protocol (DEC-047)
 */
export async function copyWeeklyShifts(sourceStartDate: string, targetStartDate: string) {
  noStore();

  const authError = await ensureShiftMutationAuthorized();
  if (authError) return { success: false, error: authError };

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
  } catch (err: unknown) {
    console.error('[copyWeeklyShifts] CRITICAL FAILURE:', err);
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดรุนแรงในการคัดลอกข้อมูล';
    return { success: false, error: message };
  }
}

/** Rename metadata.location across all shifts when a shift type label/value changes */
export async function renameShiftLocations(renames: { oldValue: string; newValue: string }[]) {
  const valid = renames.filter(
    (r) => r.oldValue?.trim() && r.newValue?.trim() && r.oldValue !== r.newValue
  );
  if (valid.length === 0) return { success: true, updated: 0 };

  try {
    const authError = await ensureShiftMutationAuthorized();
    if (authError) return { success: false, error: authError };

    let totalUpdated = 0;

    for (const { oldValue, newValue } of valid) {
      const { data: rows, error: fetchError } = await supabaseAdmin
        .from('shifts')
        .select('id, metadata')
        .filter('metadata->>location', 'eq', oldValue);

      if (fetchError) {
        console.error('Supabase Error:', fetchError.message, fetchError.details);
        return { success: false, error: fetchError.message };
      }

      for (const row of rows || []) {
        const metadata = (row.metadata as Record<string, unknown>) || {};
        const { error: updateError } = await supabaseAdmin
          .from('shifts')
          .update({ metadata: { ...metadata, location: newValue } })
          .eq('id', row.id);

        if (updateError) {
          console.error('Supabase Error:', updateError.message, updateError.details);
          return { success: false, error: updateError.message };
        }
        totalUpdated += 1;
      }
    }

    revalidateAppPaths();
    return { success: true, updated: totalUpdated };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}