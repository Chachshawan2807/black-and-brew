'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { after } from 'next/server';
import { z } from 'zod';
import type { Json } from '@/lib/database.types';
import {
  computeFieldChanges,
  type DataChangeLogInput,
  type FieldChange,
  resolveActorLabel,
  type ActorAccessLevel,
} from '@/lib/data-change-log';
import { ensureServerSession, requireServiceRoleKey } from '@/lib/security/server-auth';
import { dispatchInventoryWebPush, rowToDataChangeLogRow } from '@/lib/web-push';

const dataChangeLogInputSchema = z.object({
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE']),
  module: z.enum([
    'inventory',
    'schedule',
    'sales',
    'maintenance',
    'holiday',
    'dashboard',
    'settings',
  ]),
  entityType: z.string().min(1).max(120),
  entityId: z.string().max(120).nullable().optional(),
  entityLabel: z.string().max(500).nullable().optional(),
  fieldChanges: z
    .array(
      z.object({
        field: z.string().max(120),
        old_value: z.unknown(),
        new_value: z.unknown(),
      })
    )
    .optional(),
  oldValue: z.unknown().nullable().optional(),
  newValue: z.unknown().nullable().optional(),
  source: z.enum(['web', 'server_action', 'api', 'system']).optional(),
  status: z.enum(['success', 'failed']).optional(),
  errorMessage: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return createClient(supabaseUrl, requireServiceRoleKey());
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase auth configuration');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export interface DataChangeLogRow {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  actor_label: string;
  actor_access_level: ActorAccessLevel | null;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  field_changes: FieldChange[];
  old_value: Json | null;
  new_value: Json | null;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface FetchDataChangeLogsOptions {
  limit?: number;
  module?: string;
}

async function ensureAuthenticated(): Promise<boolean> {
  const auth = await ensureServerSession();
  return auth.ok;
}

async function resolveClientIp(): Promise<string | null> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return headerStore.get('x-real-ip') ?? headerStore.get('cf-connecting-ip') ?? null;
}

async function resolveActorContext(userAgent?: string | null): Promise<{
  actorId: string | null;
  actorLabel: string;
  actorAccessLevel: ActorAccessLevel;
}> {
  const cookieStore = await cookies();
  const readOnly = cookieStore.get('bb_auth_read_only')?.value === 'true';
  const accessLevel: ActorAccessLevel = readOnly ? 'read_only' : 'full';

  const token = cookieStore.get('sb-access-token')?.value;
  if (token) {
    try {
      const supabase = getSupabaseAuthClient();
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        return {
          actorId: user.id,
          actorLabel: resolveActorLabel(accessLevel, user.email, userAgent),
          actorAccessLevel: accessLevel,
        };
      }
    } catch {
      // Fall through to PIN-based actor
    }
  }

  return {
    actorId: null,
    actorLabel: resolveActorLabel(accessLevel, undefined, userAgent),
    actorAccessLevel: accessLevel,
  };
}

export async function recordDataChange(
  input: DataChangeLogInput
): Promise<{ success: boolean }> {
  const auth = await ensureServerSession();
  if (!auth.ok) {
    return { success: false };
  }

  const parsed = dataChangeLogInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error('[recordDataChange] Invalid input:', parsed.error.flatten());
    return { success: false };
  }

  try {
    const supabase = getSupabaseAdmin();
    const headerStore = await headers();
    const userAgent = headerStore.get('user-agent');
    const actor = await resolveActorContext(userAgent);
    const ip = await resolveClientIp();
    const safe = parsed.data;

    const resolvedFieldChanges =
      safe.fieldChanges && safe.fieldChanges.length > 0
        ? safe.fieldChanges
        : computeFieldChanges(
            safe.oldValue != null && typeof safe.oldValue === 'object' && !Array.isArray(safe.oldValue)
              ? (safe.oldValue as Record<string, unknown>)
              : null,
            safe.newValue != null && typeof safe.newValue === 'object' && !Array.isArray(safe.newValue)
              ? (safe.newValue as Record<string, unknown>)
              : null
          );

    const { data: inserted, error } = await supabase
      .from('data_change_logs')
      .insert({
      occurred_at: new Date().toISOString(),
      actor_id: actor.actorId,
      actor_label: actor.actorLabel,
      actor_access_level: actor.actorAccessLevel,
      action: safe.action,
      module: safe.module,
      entity_type: safe.entityType,
      entity_id: safe.entityId ?? null,
      entity_label: safe.entityLabel ?? null,
      field_changes: resolvedFieldChanges,
      old_value: (safe.oldValue ?? null) as Json | null,
      new_value: (safe.newValue ?? null) as Json | null,
      source: safe.source ?? 'server_action',
      ip_address: ip,
      user_agent: userAgent,
      status: safe.status ?? 'success',
      error_message: safe.errorMessage ?? null,
      metadata: safe.metadata ?? {},
    })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('Could not find the table') || error.code === 'PGRST205') {
        return { success: false };
      }
      console.error('Supabase Error:', error.message, error.details);
      return { success: false };
    }

    if (inserted && safe.module === 'inventory' && (safe.status ?? 'success') === 'success') {
      const pushRow = rowToDataChangeLogRow(inserted as Record<string, unknown>);
      after(async () => {
        try {
          await dispatchInventoryWebPush(pushRow);
        } catch (pushError) {
          console.error('[recordDataChange] Web push dispatch failed:', pushError);
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[recordDataChange] Exception:', error);
    return { success: false };
  }
}

export async function fetchDataChangeLogs(
  options: FetchDataChangeLogsOptions = {}
): Promise<{ success: true; rows: DataChangeLogRow[] } | { success: false; error: string }> {
  const authenticated = await ensureAuthenticated();
  if (!authenticated) {
    return { success: false, error: 'Unauthorized' };
  }

  const limit = options.limit ?? 50;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('data_change_logs')
      .select(
        'id, occurred_at, actor_id, actor_label, actor_access_level, action, module, entity_type, entity_id, entity_label, field_changes, old_value, new_value, source, ip_address, user_agent, status, error_message, metadata'
      )
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (options.module) {
      query = query.eq('module', options.module);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('Could not find the table') || error.code === 'PGRST205') {
        return { success: true, rows: [] };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true, rows: (data ?? []) as DataChangeLogRow[] };
  } catch {
    return { success: false, error: 'Failed to load data change history' };
  }
}
