import fs from 'node:fs';
import path from 'node:path';

const targets = [
  { file: 'app/actions/home-actions.ts', ctx: 'home-actions', fallback: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' },
  { file: 'app/actions/shift-actions.ts', ctx: 'shift-actions', fallback: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' },
  { file: 'app/actions/schedule-sheets-sync-actions.ts', ctx: 'schedule-sheets-sync', fallback: 'ซิงก์ Google Sheet ไม่สำเร็จ' },
  { file: 'app/actions/maintenance-actions.ts', ctx: 'maintenance-actions', fallback: 'บันทึกข้อมูลไม่สำเร็จ' },
];

const root = path.resolve('src');

for (const { file, ctx, fallback } of targets) {
  const fp = path.join(root, file);
  let s = fs.readFileSync(fp, 'utf8');

  s = s.replace(
    /const message = error instanceof Error \? error\.message : 'Unknown error';\s*(?:console\.error\([^\n]+\);\s*)?return \{ success: false, error: message \};/g,
    `return actionFail('${ctx}', error, '${fallback}');`,
  );

  s = s.replace(
    /const message = error instanceof Error \? error\.message : 'Unknown error';\s*return \{ success: false, error: message \};/g,
    `return actionFail('${ctx}', error, '${fallback}');`,
  );

  s = s.replace(
    /const message = err instanceof Error \? err\.message : 'Unknown error';\s*(?:console\.error\([^\n]+\);\s*)?return \{ success: false as const, error: message \};/g,
    `return actionFail('${ctx}', err, '${fallback}');`,
  );

  s = s.replace(
    /return \{ success: false, error: err instanceof Error \? err\.message : 'Unknown error' \};/g,
    `return actionFail('${ctx}', err, '${fallback}');`,
  );

  s = s.replace(
    /return \{ success: false, error: firstError\.error\?\.message \|\| 'Unknown error' \};/g,
    `return actionFail('${ctx}', firstError.error ?? firstError, '${fallback}');`,
  );

  s = s.replace(
    /error: error instanceof Error \? error\.message : 'Unknown error',/g,
    `error: toUserFacingError(error, '${fallback}'),`,
  );

  s = s.replace(
    /const errorMsg = err instanceof Error \? err\.message : 'Unknown error';/g,
    `const errorMsg = toUserFacingError(err, '${fallback}');`,
  );

  s = s.replace(
    /const message = error instanceof Error \? error\.message : 'Internal Server Error';\s*return \{ success: false as const, error: message \};/g,
    `return actionFail('${ctx}', error, '${fallback}');`,
  );

  fs.writeFileSync(fp, s);
  console.log('catch-patched', file);
}
