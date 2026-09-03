#!/usr/bin/env node
/**
 * Re-index codebase-memory-mcp and refresh ADR from live architecture metrics.
 *
 * Usage:
 *   node scripts/sync-knowledge-graph.mjs
 *   node scripts/sync-knowledge-graph.mjs --if-changed
 *   npm run graph:sync
 *   npm run graph:sync -- --if-changed
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PROJECT = 'C-Projects-black-and-brew';
const REPO_PATH = resolve(process.cwd());

const ARCHITECTURE_PATH_PREFIXES = [
  'src/app/actions/',
  'src/app/api/',
  'src/lib/',
  'src/app/[locale]/',
  'src/types/index.ts',
  'supabase/migrations/',
];

const STATIC = {
  purpose: `BLACKANDBREW ERP: ระบบบริหารร้านกาแฟ (inventory, schedule, dashboard, bean-orders, secretary AI, daily report) ใช้งานบนมือถือ/แท็บเล็ตของพนักงานเป็นหลัก เน้น optimistic UI + realtime sync, offline-first (PWA), และ AI ผู้ช่วยเชิงรุก. รองรับ 2 ภาษา (th/en).`,
  patterns: `- Hub-first fix workflow (IRON RULE ใน .cursorrules): แก้โค้ดต้องเริ่ม search_graph -> trace_path/detect_changes ก่อน grep/glob แล้วแก้ผ่าน layer กลาง (app/actions, lib, types/index.ts)
- Server Actions เป็นทางเดียวของ mutation; auth check อยู่ภายใน action เอง (src/lib/security/server-auth.ts, src/lib/policies/*)
- Spreadsheet-style inventory: native <input> ใน <td>, onChange (local) + onBlur/Enter (Supabase update), ไม่มี modal/action column
- Optimistic UI + functional setState; realtime ผ่าน InventoryRealtimeContext + supabase-realtime-channel/resume
- Offline-first: offline-mutation-queue -> sync -> replay-retry; notification เก็บใน IndexedDB (notification-idb)
- Proactive insights: lib/proactive-insights (operational snapshot, digest alerts)
- Pastel time-based shift colors (lib/shift-colors.ts) + CSS token surfaces, dark mode via next-themes`,
  tradeoffs: `- เลือก realtime/optimistic freshness เหนือ aggressive route caching: ห้าม cache inventory/sales/editable grid จน stale หลัง mutation
- Server Actions รวมศูนย์ mutation = กันโค้ดซ้ำ แต่ต้องระวังห้าม duplicate mutation ทั้ง client และ action
- lib fan-in สูง: เปลี่ยน helper กลางกระทบกว้าง ต้องใช้ trace_path เช็ค caller ก่อนเสมอ
- NotificationPanel เป็น view-only (IRON RULE): ห้าม navigation/link ในแถวแจ้งเตือน
- Typography: ห้าม em dash (U+2014) ทั้งโปรเจ็ค`,
  philosophy: `- Centralized command/data: พุ่งเข้าศูนย์กลาง (knowledge graph + layer hub) ก่อนขยายผลไปส่วนเกี่ยวข้อง
- TDD: ไม่มี production code โดยไม่มี failing test ก่อน; bug fix เริ่มจาก failing test ที่ reproduce ได้
- Root-cause-first debugging ห้าม fix แบบเดา
- Outcome-first + data symmetry, minimalist pastel UI, mobile/touch-first
- Baseline Widely available เป็นเป้าหมาย frontend; native overlay (<dialog>/popover) มากกว่า lib ซ้ำซ้อน`,
};

function parseArgs(argv) {
  return { ifChanged: argv.includes('--if-changed') };
}

function resolveMcpBinary() {
  const candidates = [
    process.env.CODEBASE_MEMORY_MCP,
    readMcpFromCursorConfig(),
    join(process.env.USERPROFILE || '', '.local', 'bin', 'codebase-memory-mcp.exe'),
    join(process.env.HOME || '', '.local', 'bin', 'codebase-memory-mcp'),
    '/usr/local/bin/codebase-memory-mcp',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    'codebase-memory-mcp binary not found. Set CODEBASE_MEMORY_MCP or install via codebase-memory-mcp install.',
  );
}

function readMcpFromCursorConfig() {
  const configPath = resolve('.cursor/mcp.json');
  if (!existsSync(configPath)) return null;
  try {
    const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
    return cfg.mcpServers?.['codebase-memory-mcp']?.command ?? null;
  } catch {
    return null;
  }
}

function mcpCli(binary, tool, flags, { allowFailure = false } = {}) {
  const args = ['cli', tool];
  for (const [key, value] of Object.entries(flags)) {
    if (value === undefined || value === null) continue;
    args.push(`--${key}`, String(value));
  }

  const result = spawnSync(binary, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    if (allowFailure) return { ok: false, error: result.error.message };
    throw result.error;
  }

  const stdout = (result.stdout || '').trim();
  const jsonLine = stdout.split('\n').find((line) => line.startsWith('{') || line.startsWith('['));
  const parsed = jsonLine ? JSON.parse(jsonLine) : stdout;

  if (result.status !== 0) {
    const message = `codebase-memory-mcp cli ${tool} failed (exit ${result.status}): ${result.stderr || result.stdout}`;
    if (allowFailure) return { ok: false, error: message, data: parsed };
    throw new Error(message);
  }

  return { ok: true, data: parsed };
}

function mcpCliWithArgsFile(binary, tool, payload, { allowFailure = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'bb-graph-sync-'));
  const file = join(dir, 'args.json');
  try {
    writeFileSync(file, JSON.stringify(payload), 'utf8');
    const result = spawnSync(binary, ['cli', tool, '--args-file', file], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) {
      if (allowFailure) return { ok: false, error: result.error.message };
      throw result.error;
    }
    const stdout = (result.stdout || '').trim();
    const jsonLine = stdout.split('\n').find((line) => line.startsWith('{') || line.startsWith('['));
    const parsed = jsonLine ? JSON.parse(jsonLine) : stdout;
    if (result.status !== 0) {
      const message = `codebase-memory-mcp cli ${tool} failed (exit ${result.status}): ${result.stderr || result.stdout}`;
      if (allowFailure) return { ok: false, error: message, data: parsed };
      throw new Error(message);
    }
    return { ok: true, data: parsed };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function hasArchitectureChanges() {
  try {
    const names = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const staged = execFileSync('git', ['diff', '--name-only', '--cached'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const changed = new Set([...names, ...staged]);
    return [...changed].some((path) =>
      ARCHITECTURE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)),
    );
  } catch {
    return true;
  }
}

function countByPrefix(fileTree, prefix) {
  if (!Array.isArray(fileTree)) return 0;
  let count = 0;
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'file' && node.path?.startsWith(prefix)) count += 1;
      if (node.children?.length) walk(node.children);
    }
  };
  walk(fileTree);
  return count;
}

function pkg(arch, name) {
  return arch.packages?.find((p) => p.name === name);
}

function topBoundaries(arch, limit = 5) {
  return (arch.boundaries || [])
    .slice(0, limit)
    .map((b) => `${b.from}->${b.to} (${b.call_count})`)
    .join(', ');
}

function buildAdr(arch, indexResult) {
  const tsFiles = arch.languages?.find((l) => l.language === 'TypeScript')?.file_count ?? '?';
  const migrations = countByPrefix(arch.file_tree, 'supabase/migrations/');
  const tests = countByPrefix(arch.file_tree, 'src/test/');
  const actions = countByPrefix(arch.file_tree, 'src/app/actions/');
  const libPkg = pkg(arch, 'lib');
  const appPkg = pkg(arch, 'app');
  const hooksPkg = pkg(arch, 'hooks');
  const componentsPkg = pkg(arch, 'components');
  const routes = (arch.routes || [])
    .map((r) => `${r.method || 'GET'} ${r.path}`)
    .slice(0, 8)
    .join(', ');

  const stack = `- Next.js App Router + React (TypeScript ~${tsFiles} ไฟล์), route หลักอยู่ใต้ src/app/[locale]/
- Supabase backend (Postgres + RLS + Realtime): ${migrations} migrations ใน supabase/migrations
- Vitest test runner (~${tests} ไฟล์ใน src/test)
- next-intl (messages/en.json, th.json), next-themes (bb-theme)
- PWA: public/sw.js, offline.html, offline-mutation-store, notification-store, web-push
- Google Sheets sync สำหรับ schedule (src/lib/google, src/lib/schedule/sheets-*)`;

  const architecture = `Layered ตาม knowledge graph (อัปเดตอัตโนมัติ ${new Date().toISOString().slice(0, 10)}):
- CORE: src/lib (fan-in ${libPkg?.fan_in ?? '?'}, fan-out ${libPkg?.fan_out ?? '?'}) = domain logic ทั้งหมด
- INTERNAL: src/app (fan-out ${appPkg?.fan_out ?? '?'}), src/components (in ${componentsPkg?.fan_in ?? '?'}/out ${componentsPkg?.fan_out ?? '?'}), src/hooks (in ${hooksPkg?.fan_in ?? '?'}/out ${hooksPkg?.fan_out ?? '?'})
- API routes: ${routes || '(none indexed)'}
- MUTATIONS HUB: src/app/actions/*.ts (~${actions} ไฟล์ Server Actions)
- DATA LAYER: src/lib/supabase-server.ts (server) / src/lib/supabase.ts (client)
- TYPES HUB: src/types/index.ts + database.types.ts
- Graph stats: ${arch.total_nodes ?? indexResult?.nodes ?? '?'} nodes, ${arch.total_edges ?? indexResult?.edges ?? '?'} edges
- Top boundaries: ${topBoundaries(arch) || '(none)'}`;

  return [
    '## PURPOSE',
    STATIC.purpose,
    '',
    '## STACK',
    stack,
    '',
    '## ARCHITECTURE',
    architecture,
    '',
    '## PATTERNS',
    STATIC.patterns,
    '',
    '## TRADEOFFS',
    STATIC.tradeoffs,
    '',
    '## PHILOSOPHY',
    STATIC.philosophy,
  ].join('\n');
}

function main() {
  const { ifChanged } = parseArgs(process.argv.slice(2));

  if (ifChanged && !hasArchitectureChanges()) {
    console.log('graph:sync skipped (no architecture-path changes detected)');
    return;
  }

  const binary = resolveMcpBinary();
  console.log(`graph:sync using ${binary}`);

  console.log('graph:sync indexing repository...');
  const indexAttempt = mcpCli(
    binary,
    'index_repository',
    { repo_path: REPO_PATH, mode: 'full' },
    { allowFailure: true },
  );
  const indexResult = indexAttempt.ok ? indexAttempt.data : null;
  if (!indexAttempt.ok) {
    console.warn(
      'graph:sync warning: CLI index_repository failed; continuing with existing graph for ADR refresh.',
    );
    console.warn('graph:sync hint: AI agents should call MCP index_repository directly when index is required.');
  }

  console.log('graph:sync reading architecture...');
  const archResult = mcpCli(binary, 'get_architecture', {
    project: PROJECT,
    aspects: 'all',
  });
  const arch = archResult.data;

  const content = buildAdr(arch, indexResult);

  console.log('graph:sync updating ADR...');
  const adrAttempt = mcpCliWithArgsFile(
    binary,
    'manage_adr',
    { project: PROJECT, mode: 'store', content },
    { allowFailure: true },
  );

  if (!adrAttempt.ok) {
    console.warn('graph:sync warning: CLI manage_adr failed.');
    console.warn('graph:sync hint: Cursor agents must run MCP manage_adr(mode=update) directly.');
    console.warn(adrAttempt.error);
    process.exit(1);
  }

  const adrResult = adrAttempt.data;

  console.log(
    `OK: graph synced (indexed=${indexResult ? 'yes' : 'skipped'}, nodes=${indexResult?.nodes ?? arch.total_nodes}, edges=${indexResult?.edges ?? arch.total_edges}, adr=${adrResult.status ?? 'updated'})`,
  );
}

main();
