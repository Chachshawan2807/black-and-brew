'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import type { Json } from '@/lib/database.types';
import {
  type DataChangeLogInput,
  type FieldChange,
  resolveActorLabel,
  type ActorAccessLevel,
} from '@/lib/data-change-log';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  const cookieStore = await cookies();
  return cookieStore.get('bb_auth_pin_verified')?.value === 'true';
}

async function resolveClientIp(): Promise<string | null> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return headerStore.get('x-real-ip') ?? headerStore.get('cf-connecting-ip') ?? null;
}

async function resolveActorContext(): Promise<{
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
      const supabase = createClient(supabaseUrl, supabaseAdminKey);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        return {
          actorId: user.id,
          actorLabel: resolveActorLabel(accessLevel, user.email),
          actorAccessLevel: accessLevel,
        };
      }
    } catch {
      // Fall through to PIN-based actor
    }
  }

  return {
    actorId: null,
    actorLabel: resolveActorLabel(accessLevel),
    actorAccessLevel: accessLevel,
  };
}

export async function recordDataChange(
  input: DataChangeLogInput
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAdminKey);
    const actor = await resolveActorContext();
    const ip = await resolveClientIp();
    const headerStore = await headers();
    const userAgent = headerStore.get('user-agent');

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: new Date().toISOString(),
      actor_id: actor.actorId,
      actor_label: actor.actorLabel,
      actor_access_level: actor.actorAccessLevel,
      action: input.action,
      module: input.module,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      field_changes: input.fieldChanges ?? [],
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      source: input.source ?? 'server_action',
      ip_address: ip,
      user_agent: userAgent,
      status: input.status ?? 'success',
      error_message: input.errorMessage ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) {
      if (error.message?.includes('Could not find the table') || error.code === 'PGRST205') {
        return { success: false };
      }
      console.error('Supabase Error:', error.message, error.details);
      return { success: false };
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
    const supabase = createClient(supabaseUrl, supabaseAdminKey);
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
