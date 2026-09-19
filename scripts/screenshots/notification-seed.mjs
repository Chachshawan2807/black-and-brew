import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { REPO_ROOT } from './paths.mjs';

const SEED_PATH = path.join(REPO_ROOT, 'docs/marketing/screenshots/notification-list.seed.json');

const CATCH_UP_MODULES = ['inventory', 'schedule', 'bean_orders', 'insights', 'security'];

const DATA_CHANGE_LOG_SELECT =
  'id, occurred_at, actor_id, actor_label, actor_access_level, action, module, entity_type, entity_id, entity_label, field_changes, old_value, new_value, source, ip_address, user_agent, status, error_message, metadata';

function parseEnvLocal(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n#]+)"?\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function rowToNotification(row) {
  const label = row.entity_label?.trim() || row.module || 'Update';
  const summary =
    typeof row.new_value === 'string' && row.new_value.trim()
      ? row.new_value.trim()
      : typeof row.old_value === 'string' && row.old_value.trim()
        ? row.old_value.trim()
        : label;

  return {
    id: row.id,
    logId: row.id,
    action: row.action ?? 'update',
    entityId: row.entity_id ?? null,
    entityLabel: row.entity_label ?? null,
    actorLabel: row.actor_label?.trim() || 'System',
    occurredAt: row.occurred_at,
    title: label,
    summary,
    fieldSummary: '',
    priority: 'normal',
    read: false,
    batchedCount: 1,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  };
}

export async function loadNotificationSeedJson() {
  try {
    const raw = await fs.readFile(SEED_PATH, 'utf8');
    JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
}

export async function buildNotificationSeedFromSupabase() {
  let envText = '';
  try {
    envText = await fs.readFile(path.join(REPO_ROOT, '.env.local'), 'utf8');
  } catch {
    return null;
  }

  const env = parseEnvLocal(envText);
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SECRET_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('data_change_logs')
    .select(DATA_CHANGE_LOG_SELECT)
    .in('module', CATCH_UP_MODULES)
    .order('occurred_at', { ascending: false })
    .limit(40);

  if (error || !data?.length) return null;

  const notifications = data.map(rowToNotification);
  return JSON.stringify(notifications);
}

export async function resolveNotificationSeedJson() {
  const fromFile = await loadNotificationSeedJson();
  if (fromFile) return { json: fromFile, source: 'file' };

  const fromDb = await buildNotificationSeedFromSupabase();
  if (fromDb) return { json: fromDb, source: 'supabase' };

  return null;
}

export async function writeNotificationSeedFromPage(page) {
  const json = await page.evaluate(() => localStorage.getItem('bb-inventory-notifications'));
  if (!json) return false;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
  } catch {
    return false;
  }
  await fs.mkdir(path.dirname(SEED_PATH), { recursive: true });
  await fs.writeFile(SEED_PATH, json);
  return true;
}
