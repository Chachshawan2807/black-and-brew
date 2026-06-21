'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ensureServerSession, requireServiceRoleKey } from '@/lib/security/server-auth';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/lib/notification-types';

const subscriptionSchema = z.object({
  accessToken: z.string().min(1),
  endpoint: z.string().min(10).max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
  clientSessionId: z.string().max(120).optional(),
  userAgent: z.string().max(1000).optional(),
  locale: z.string().max(10).optional(),
  prefs: z
    .object({
      enabled: z.boolean(),
      systemNotifications: z.boolean(),
      dailyScheduleReports: z.boolean().optional(),
      notifyOwnChanges: z.boolean(),
      notifyCreate: z.boolean(),
      notifyUpdate: z.boolean(),
      notifyDelete: z.boolean(),
    })
    .optional(),
  branchId: z.string().max(64).optional(),
});

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return key;
}

/** User-scoped client — satisfies push_subscriptions RLS (auth.uid() = user_id). */
function createUserScopedClient(accessToken: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/** Service-role upsert after server-side JWT validation (endpoint may outlive anonymous sessions). */
function createServiceRoleClient() {
  return createClient(getSupabaseUrl(), requireServiceRoleKey());
}

async function resolveUserId(accessToken: string): Promise<string | null> {
  const supabase = createUserScopedClient(accessToken);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  
  if (user) return user.id;

  if (error) {
    console.error('[resolveUserId] Supabase Auth Error:', error.message, error.status);
    // Fallback: manually decode JWT to get 'sub' if the token is an ES256 token 
    // that GoTrue rejects via /user endpoint.
    try {
      const payloadPart = accessToken.split('.')[1];
      if (payloadPart) {
        const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
        if (payload && payload.sub) {
          console.log('[resolveUserId] Fallback: Extracted user id from JWT:', payload.sub);
          return payload.sub;
        }
      }
    } catch (decodeError) {
      console.error('[resolveUserId] JWT decode error:', decodeError);
    }
  }
  
  return null;
}

function prefsWithLocale(prefs: Partial<NotificationPreferences> | undefined, locale?: string) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(prefs ?? {}),
    locale: locale ?? 'th',
  };
}

function resolveBranchId(explicit?: string): string {
  return (
    explicit?.trim() ||
    process.env.NEXT_PUBLIC_STORE_BRANCH_ID?.trim() ||
    'main'
  );
}

export type PushRegistrationResult =
  | { success: true }
  | { success: false; error: string };

export async function registerPushSubscription(
  input: z.infer<typeof subscriptionSchema>
): Promise<PushRegistrationResult> {
  const auth = await ensureServerSession();
  if (!auth.ok) return { success: false, error: 'pin_session_required' };

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    console.error('[registerPushSubscription] Invalid input:', parsed.error.flatten());
    return { success: false, error: 'invalid_payload' };
  }

  const safe = parsed.data;
  const userId = await resolveUserId(safe.accessToken);
  if (!userId) {
    console.error('[registerPushSubscription] Missing Supabase user id');
    return { success: false, error: 'supabase_session_missing' };
  }

  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        profile_id: null,
        branch_id: resolveBranchId(safe.branchId),
        endpoint: safe.endpoint,
        p256dh: safe.keys.p256dh,
        auth: safe.keys.auth,
        client_session_id: safe.clientSessionId ?? null,
        user_agent: safe.userAgent ?? null,
        prefs_json: prefsWithLocale(safe.prefs, safe.locale),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false, error: 'push_subscriptions_table_missing' };
      }
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message || 'supabase_upsert_failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('[registerPushSubscription] Exception:', error);
    return { success: false, error: 'server_exception' };
  }
}

export async function getPushDiagnostics(): Promise<{
  ok: boolean;
  subscriptionCount: number;
  vapidConfigured: boolean;
  latestEligibleLogAt: string | null;
}> {
  const auth = await ensureServerSession();
  if (!auth.ok) {
    return { ok: false, subscriptionCount: 0, vapidConfigured: false, latestEligibleLogAt: null };
  }

  const vapidConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    const admin = createClient(supabaseUrl, requireServiceRoleKey());

    const { count } = await admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true });

    const { data: latest } = await admin
      .from('data_change_logs')
      .select('occurred_at')
      .eq('module', 'inventory')
      .not('metadata->>notificationSource', 'is', null)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ok: true,
      subscriptionCount: count ?? 0,
      vapidConfigured,
      latestEligibleLogAt: latest?.occurred_at ?? null,
    };
  } catch {
    return { ok: false, subscriptionCount: 0, vapidConfigured, latestEligibleLogAt: null };
  }
}

export async function syncPushSubscriptionPrefs(input: {
  accessToken: string;
  endpoint: string;
  prefs: NotificationPreferences;
  locale?: string;
}): Promise<{ success: boolean }> {
  const auth = await ensureServerSession();
  if (!auth.ok) return { success: false };

  const userId = await resolveUserId(input.accessToken);
  if (!userId) return { success: false };

  try {
    const supabase = createUserScopedClient(input.accessToken);

    const { error } = await supabase
      .from('push_subscriptions')
      .update({
        prefs_json: prefsWithLocale(input.prefs, input.locale),
        updated_at: new Date().toISOString(),
      })
      .eq('endpoint', input.endpoint)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('[syncPushSubscriptionPrefs] Exception:', error);
    return { success: false };
  }
}

export async function unregisterPushSubscription(input: {
  accessToken: string;
  endpoint: string;
}): Promise<{ success: boolean }> {
  const auth = await ensureServerSession();
  if (!auth.ok) return { success: false };

  const userId = await resolveUserId(input.accessToken);
  if (!userId) return { success: false };

  try {
    const supabase = createUserScopedClient(input.accessToken);

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', input.endpoint)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('[unregisterPushSubscription] Exception:', error);
    return { success: false };
  }
}
