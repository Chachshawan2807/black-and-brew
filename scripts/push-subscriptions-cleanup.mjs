/**
 * Dry-run or apply cleanup for public.push_subscriptions.
 *
 * Usage:
 *   node scripts/push-subscriptions-cleanup.mjs
 *   node scripts/push-subscriptions-cleanup.mjs --apply --mode=stale
 *   node scripts/push-subscriptions-cleanup.mjs --apply --mode=all --confirm=REMOVE_ALL
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  const args = { apply: false, mode: 'stale', confirm: '', staleDays: 60 };
  for (const raw of argv) {
    if (raw === '--apply') args.apply = true;
    else if (raw.startsWith('--mode=')) args.mode = raw.slice('--mode='.length);
    else if (raw.startsWith('--confirm=')) args.confirm = raw.slice('--confirm='.length);
    else if (raw.startsWith('--stale-days=')) {
      args.staleDays = Number(raw.slice('--stale-days='.length));
    }
  }
  return args;
}

function platformFromEndpoint(endpoint) {
  if (endpoint.includes('fcm.googleapis.com')) return 'android';
  if (endpoint.includes('web.push.apple.com')) return 'apple';
  return 'other';
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const args = parseArgs(process.argv.slice(2));

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!['stale', 'all'].includes(args.mode)) {
  console.error('--mode must be stale or all');
  process.exit(1);
}

const sb = createClient(url, key);
const staleCutoff = new Date(Date.now() - args.staleDays * 24 * 60 * 60 * 1000).toISOString();

const { data: rows, error } = await sb
  .from('push_subscriptions')
  .select('id, endpoint, user_agent, client_session_id, updated_at')
  .order('updated_at', { ascending: false });

if (error) {
  console.error('Supabase Error:', error.message, error.details);
  process.exit(1);
}

const all = rows ?? [];
const stale = all.filter((row) => row.updated_at && row.updated_at < staleCutoff);
const targets = args.mode === 'all' ? all : stale;

const summary = { total: all.length, android: 0, apple: 0, other: 0 };
for (const row of all) {
  const p = platformFromEndpoint(row.endpoint ?? '');
  summary[p] += 1;
}

console.log('push_subscriptions summary');
console.log(`  total:   ${summary.total}`);
console.log(`  android: ${summary.android}`);
console.log(`  apple:   ${summary.apple}`);
console.log(`  other:   ${summary.other}`);
console.log(`  stale (>${args.staleDays}d): ${stale.length}`);
console.log(`  mode:    ${args.mode}`);
console.log(`  action:  ${args.apply ? 'APPLY DELETE' : 'dry-run only'}`);

if (targets.length === 0) {
  console.log('\nNothing to delete.');
  process.exit(0);
}

console.log(`\nWould delete ${targets.length} row(s):`);
for (const row of targets.slice(0, 25)) {
  console.log(
    `  - ${row.id} | ${platformFromEndpoint(row.endpoint ?? '')} | ${row.updated_at ?? 'no date'} | ${(row.user_agent ?? '').slice(0, 60)}`,
  );
}
if (targets.length > 25) {
  console.log(`  ... and ${targets.length - 25} more`);
}

if (!args.apply) {
  console.log('\nDry-run complete. Re-run with --apply to delete.');
  console.log('  stale: node scripts/push-subscriptions-cleanup.mjs --apply --mode=stale');
  console.log('  all:   node scripts/push-subscriptions-cleanup.mjs --apply --mode=all --confirm=REMOVE_ALL');
  process.exit(0);
}

if (args.mode === 'all' && args.confirm !== 'REMOVE_ALL') {
  console.error('\nRefusing full wipe without --confirm=REMOVE_ALL');
  process.exit(1);
}

const ids = targets.map((row) => row.id);
const { error: deleteError, count } = await sb
  .from('push_subscriptions')
  .delete({ count: 'exact' })
  .in('id', ids);

if (deleteError) {
  console.error('Delete failed:', deleteError.message, deleteError.details);
  process.exit(1);
}

console.log(`\nDeleted ${count ?? ids.length} subscription row(s).`);
console.log('Each device must open the app after PIN and register push again (Android auto-registers after PIN).');
