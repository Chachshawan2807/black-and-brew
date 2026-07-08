'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { computeFieldChanges } from '@/lib/data-change-log';
import { gateMutation } from '@/lib/policies/server-gate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function ensureAuthorized() {
  return gateMutation();
}

const serviceRecordSchema = z.object({
  start_date: z.string().min(1),
  equipment: z.string().min(1).max(200),
  detected_problem: z.string().max(1000).nullable(),
  task_type: z.string().min(1).max(100),
  work_details: z.string().max(2000).nullable(),
  recommended_frequency: z.string().max(100).nullable(),
  cost: z.number().min(0),
  person_in_charge: z.string().max(200).nullable(),
  status: z.string().min(1).max(50),
  notes: z.string().max(2000).nullable(),
  completion_date: z.string().nullable(),
});

const recordIdSchema = z.string().uuid().optional();

export type ServiceRecordPayload = z.infer<typeof serviceRecordSchema>;

export async function saveServiceRecord(
  payload: ServiceRecordPayload,
  recordId?: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureAuthorized();
  if (!auth.success) {
    return auth;
  }

  const parsedPayload = serviceRecordSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return { success: false, error: 'Invalid service record payload' };
  }

  const parsedId = recordIdSchema.safeParse(recordId);
  if (!parsedId.success) {
    return { success: false, error: 'Invalid record ID' };
  }

  try {
    const validated = parsedPayload.data;
    if (parsedId.data) {
      const { data: beforeRecord } = await supabaseAdmin
        .from('service_records')
        .select('*')
        .eq('id', parsedId.data)
        .maybeSingle();

      const { error } = await supabaseAdmin
        .from('service_records')
        .update(validated)
        .eq('id', parsedId.data);

      if (error) {
        console.error('[saveServiceRecord] Supabase Error:', error.message, error.details);
        await recordDataChange({
          action: 'UPDATE',
          module: 'maintenance',
          entityType: 'service_record',
          entityId: parsedId.data,
          entityLabel: validated.equipment,
          status: 'failed',
          errorMessage: error.message,
        });
        return { success: false, error: error.message };
      }

      await recordDataChange({
        action: 'UPDATE',
        module: 'maintenance',
        entityType: 'service_record',
        entityId: parsedId.data,
        entityLabel: validated.equipment,
        fieldChanges: computeFieldChanges(beforeRecord ?? {}, validated),
        oldValue: beforeRecord ?? null,
        newValue: validated,
      });
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from('service_records')
        .insert([validated])
        .select()
        .single();

      if (error) {
        console.error('[saveServiceRecord] Supabase Error:', error.message, error.details);
        await recordDataChange({
          action: 'CREATE',
          module: 'maintenance',
          entityType: 'service_record',
          entityLabel: validated.equipment,
          newValue: validated,
          status: 'failed',
          errorMessage: error.message,
        });
        return { success: false, error: error.message };
      }

      await recordDataChange({
        action: 'CREATE',
        module: 'maintenance',
        entityType: 'service_record',
        entityId: inserted?.id ?? null,
        entityLabel: validated.equipment,
        fieldChanges: computeFieldChanges(null, validated),
        newValue: validated,
      });
    }

    revalidatePath('/[locale]/maintenance', 'page');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
    console.error('[saveServiceRecord] Unexpected Error:', message);
    return { success: false, error: message };
  }
}

export async function deleteServiceRecord(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureAuthorized();
  if (!auth.success) {
    return auth;
  }

  const parsedId = z.string().uuid().safeParse(recordId);
  if (!parsedId.success) {
    return { success: false, error: 'Missing or invalid record ID' };
  }

  try {
    const { data: beforeRecord } = await supabaseAdmin
      .from('service_records')
      .select('*')
      .eq('id', parsedId.data)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from('service_records')
      .delete()
      .eq('id', parsedId.data);

    if (error) {
      console.error('[deleteServiceRecord] Supabase Error:', error.message, error.details);
      await recordDataChange({
        action: 'DELETE',
        module: 'maintenance',
        entityType: 'service_record',
        entityId: parsedId.data,
        entityLabel: beforeRecord?.equipment ?? null,
        oldValue: beforeRecord ?? null,
        status: 'failed',
        errorMessage: error.message,
      });
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'DELETE',
      module: 'maintenance',
      entityType: 'service_record',
      entityId: parsedId.data,
      entityLabel: beforeRecord?.equipment ?? null,
      oldValue: beforeRecord ?? null,
    });

    revalidatePath('/[locale]/maintenance', 'page');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
    console.error('[deleteServiceRecord] Unexpected Error:', message);
    return { success: false, error: message };
  }
}
