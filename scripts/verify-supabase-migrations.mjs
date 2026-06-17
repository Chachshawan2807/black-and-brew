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

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(url, key);

const checks = [
  { name: 'login_history table', run: () => sb.from('login_history').select('id').limit(1) },
  { name: 'data_change_logs table', run: () => sb.from('data_change_logs').select('id').limit(1) },
  { name: 'push_subscriptions table', run: () => sb.from('push_subscriptions').select('id').limit(1) },
  { name: 'revoked_sessions table', run: () => sb.from('revoked_sessions').select('session_fingerprint').limit(1) },
  { name: 'device_passkeys table', run: () => sb.from('device_passkeys').select('id').limit(1) },
  { name: 'inventory_transactions table', run: () => sb.from('inventory_transactions').select('id, type').limit(1) },
];

let failed = 0;
for (const check of checks) {
  const { error } = await check.run();
  if (error) {
    console.log(`FAIL  ${check.name}: ${error.code ?? ''} ${error.message}`);
    failed += 1;
  } else {
    console.log(`OK    ${check.name}`);
  }
}

const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown';
console.log(`\nProject ref: ${ref}`);
console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed — run pending migrations.`);

process.exit(failed > 0 ? 1 : 0);
