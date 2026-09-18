import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');
const actionsDir = path.join(root, 'src', 'app', 'actions');

/** Exported server actions that read ERP data should gate on PIN read access (or equivalent). */
const READ_EXPORT_PREFIX = /^(fetch|load|get|search|compile|count|parse)/;

const READ_GATE_PATTERNS = [
  /requireReadAccess\s*\(/,
  /ensureAuthenticated\s*\(/,
  /ensureServerSession\s*\(/,
  /getAuthSessionInfo\s*\(/,
  /requirePinReadAccess\s*\(/,
];

/**
 * Intentional exceptions (document why in comment when adding):
 * - auth / passkey bootstrap (pre-PIN or session probes)
 * - daily-report: also invoked from CRON route without PIN cookies
 */
const READ_ACCESS_ALLOWLIST = new Set<string>([
  'auth.ts:getAuthSessionInfo',
  'auth.ts:getCurrentSessionFingerprint',
  'passkey-actions.ts:getPasskeyLoginOptions',
]);

type ExportedFn = { file: string; name: string; body: string; fullSource: string };

function listActionFiles(): string[] {
  return fs
    .readdirSync(actionsDir)
    .filter((name) => name.endsWith('.ts'))
    .sort();
}

function extractExportedAsyncFunctions(source: string, file: string): ExportedFn[] {
  const matches: { name: string; start: number }[] = [];
  const re = /export async function (\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    matches.push({ name: m[1], start: m.index });
  }

  return matches.map((match, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].start : source.length;
    const chunk = source.slice(match.start, end);
    const bodyStart = chunk.indexOf('{');
    const body = bodyStart >= 0 ? chunk.slice(bodyStart) : chunk;
    return { file, name: match.name, body, fullSource: source };
  });
}

function extractFunctionBody(source: string, name: string): string | null {
  const marker = `export async function ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const next = source.indexOf('export async function ', start + marker.length);
  const chunk = source.slice(start, next < 0 ? undefined : next);
  const bodyStart = chunk.indexOf('{');
  return bodyStart >= 0 ? chunk.slice(bodyStart) : null;
}

function bodyHasReadGate(body: string, fullSource: string): boolean {
  if (READ_GATE_PATTERNS.some((pattern) => pattern.test(body))) {
    return true;
  }

  const delegated = [...body.matchAll(/await (fetch[A-Za-z0-9_]*|load[A-Za-z0-9_]*)\(/g)].map(
    (match) => match[1],
  );
  for (const callee of delegated) {
    const calleeBody = extractFunctionBody(fullSource, callee);
    if (calleeBody && READ_GATE_PATTERNS.some((pattern) => pattern.test(calleeBody))) {
      return true;
    }
  }

  return false;
}

function collectReadExports(): ExportedFn[] {
  const out: ExportedFn[] = [];
  for (const file of listActionFiles()) {
    const source = fs.readFileSync(path.join(actionsDir, file), 'utf-8');
    for (const fn of extractExportedAsyncFunctions(source, file)) {
      if (READ_EXPORT_PREFIX.test(fn.name)) {
        out.push(fn);
      }
    }
  }
  return out;
}

describe('server actions read-access audit', () => {
  test('every fetch/load/get* export gates read access (or is allowlisted)', () => {
    const violations: string[] = [];

    for (const fn of collectReadExports()) {
      const key = `${fn.file}:${fn.name}`;
      if (READ_ACCESS_ALLOWLIST.has(key)) continue;
      if (!bodyHasReadGate(fn.body, fn.fullSource)) {
        violations.push(key);
      }
    }

    expect(violations).toEqual([]);
  });

  test('allowlist entries still exist (stale allowlist guard)', () => {
    const names = new Set(collectReadExports().map((fn) => `${fn.file}:${fn.name}`));
    const stale = [...READ_ACCESS_ALLOWLIST].filter((key) => !names.has(key));
    expect(stale).toEqual([]);
  });
});
