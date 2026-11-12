/**
 * Purge IN/OUT/ADJUST rows in inventory_transactions older than N months.
 *
 * Usage:
 *   node scripts/inventory-transaction-retention.mjs
 *   node scripts/inventory-transaction-retention.mjs --apply
 *   node scripts/inventory-transaction-retention.mjs --apply --months=6
 *
 * Production: POSTGRES RPC via GET /api/inventory-transaction-retention (cron every 6 months).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TYPES = ['IN', 'OUT', 'ADJUST'];
const BATCH_SIZE = 500;

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function parseArgs(argv) {
  const args = { apply: false, months: 6 };
  for (const raw of argv) {
    if (raw === '--apply') args.apply = true;
    else if (raw.startsWith('--months=')) {
      args.months = Number(raw.slice('--months='.length));
    }
  }
  return args;
}

function cutoffIso(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

async function countMatching(sb, cutoff) {
  const { count, error } = await sb
    .from('inventory_transactions')
    .select('id', { count: 'exact', head: true })
    .in('type', TYPES)
    .lt('transaction_at', cutoff);
  if (error) throw error;
  return count ?? 0;
}

async function countByType(sb, cutoff) {
  const out = {};
  for (const type of TYPES) {
    const { count, error } = await sb
      .from('inventory_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', type)
      .lt('transaction_at', cutoff);
    if (error) throw error;
    out[type] = count ?? 0;
  }
  return out;
}

async function deleteBatch(sb, cutoff) {
  const { data: ids, error: selectError } = await sb
    .from('inventory_transactions')
    .select('id')
    .in('type', TYPES)
    .lt('transaction_at', cutoff)
    .order('transaction_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (selectError) throw selectError;
  if (!ids?.length) return 0;

  const idList = ids.map((r) => r.id);
  const { error: deleteError } = await sb.from('inventory_transactions').delete().in('id', idList);
  if (deleteError) throw deleteError;
  return idList.length;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const args = parseArgs(process.argv.slice(2));

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!Number.isFinite(args.months) || args.months <= 0) {
  console.error('--months must be a positive number');
  process.exit(1);
}

const sb = createClient(url, key);
const cutoff = cutoffIso(args.months);

const { count: totalAll, error: totalErr } = await sb
  .from('inventory_transactions')
  .select('id', { count: 'exact', head: true });
if (totalErr) throw totalErr;

const toDelete = await countMatching(sb, cutoff);
const byType = await countByType(sb, cutoff);

const report = {
  mode: args.apply ? 'apply' : 'dry-run',
  retentionMonths: args.months,
  cutoffUtc: cutoff,
  totalRowsBefore: totalAll ?? 0,
  rowsEligible: toDelete,
  eligibleByType: byType,
  deleted: 0,
  totalRowsAfter: totalAll ?? 0,
};

if (args.apply && toDelete > 0) {
  let deleted = 0;
  for (;;) {
    const n = await deleteBatch(sb, cutoff);
    if (n === 0) break;
    deleted += n;
    process.stderr.write(`deleted batch: ${n} (total ${deleted})\n`);
  }
  report.deleted = deleted;
  const { count: afterCount, error: afterErr } = await sb
    .from('inventory_transactions')
    .select('id', { count: 'exact', head: true });
  if (afterErr) throw afterErr;
  report.totalRowsAfter = afterCount ?? 0;
}

console.log(JSON.stringify(report, null, 2));
