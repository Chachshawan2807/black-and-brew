import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');

const files = [
  { file: 'app/actions/home-actions.ts', ctx: 'home-actions', fallback: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' },
  { file: 'app/actions/shift-actions.ts', ctx: 'shift-actions', fallback: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' },
  { file: 'app/actions/maintenance-actions.ts', ctx: 'maintenance-actions', fallback: 'บันทึกข้อมูลไม่สำเร็จ' },
  { file: 'app/actions/branch-withdraw-actions.ts', ctx: 'branch-withdraw-actions', fallback: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' },
  { file: 'app/actions/push-actions.ts', ctx: 'push-actions', fallback: 'ลงทะเบียนการแจ้งเตือนไม่สำเร็จ' },
  { file: 'app/actions/holiday-actions.ts', ctx: 'holiday-actions', fallback: 'บันทึกวันหยุดไม่สำเร็จ' },
  { file: 'lib/secretary/apply-derived-task-drafts.ts', ctx: 'apply-derived-task-drafts', fallback: 'บันทึกงานไม่สำเร็จ' },
  { file: 'app/actions/inventory-actions.ts', ctx: 'inventory-actions', fallback: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' },
];

function ensureImport(content) {
  if (content.includes("from '@/lib/user-facing-error'")) return content;
  const lines = content.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  const imp =
    "import { actionFail, actionFailWith, logSupabaseError, toUserFacingError } from '@/lib/user-facing-error';";
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, imp);
  } else {
    lines.unshift(imp);
  }
  return lines.join('\n');
}

function patchFile(rel, ctx, defaultFallback) {
  const fp = path.join(root, rel);
  let s = fs.readFileSync(fp, 'utf8');
  s = ensureImport(s);

  s = s.replace(
    /return \{\s*success:\s*false(?:\s+as\s+const)?,\s*error:\s*([a-zA-Z0-9_]+)\.message([^}]*)\}/g,
    (m, expr, tail) => {
      const trimmed = tail.trim();
      if (trimmed.startsWith(',')) {
        const extra = trimmed.slice(1).trim();
        return `return actionFailWith('${ctx}', ${expr}, '${defaultFallback}', { ${extra} })`;
      }
      return `return actionFail('${ctx}', ${expr}, '${defaultFallback}')`;
    },
  );

  s = s.replace(
    /return \{\s*success:\s*false,\s*error:\s*error\.message \|\| '[^']+'\s*\}/g,
    () => `return actionFail('${ctx}', error, '${defaultFallback}')`,
  );

  s = s.replace(
    /return \{\s*error:\s*([a-zA-Z0-9_]+)\.message\s*\}/g,
    (_, expr) => `return { error: toUserFacingError(${expr}, '${defaultFallback}') }`,
  );

  s = s.replace(
    /return error instanceof Error \? error\.message : String\(error\)/g,
    `toUserFacingError(error, '${defaultFallback}')`,
  );

  s = s.replace(
    /const message = getErrorMessage\(error\);\s*return \{ success: false, error: message([^}]*)\}/g,
    (_, tail) => {
      const trimmed = tail.trim();
      if (trimmed.startsWith(',')) {
        const extra = trimmed.slice(1).trim();
        return `return actionFailWith('${ctx}', error, '${defaultFallback}', { ${extra} })`;
      }
      return `return actionFail('${ctx}', error, '${defaultFallback}')`;
    },
  );

  fs.writeFileSync(fp, s);
  console.log('patched', rel);
}

for (const f of files) patchFile(f.file, f.ctx, f.fallback);
