import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ACTIONS = path.join(process.cwd(), 'src/app/actions/bean-order-actions.ts');

function extractFunctionSource(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  if (start < 0) return '';
  const nextExport = source.indexOf('\nexport async function ', start + 1);
  return nextExport >= 0 ? source.slice(start, nextExport) : source.slice(start);
}

describe('bean order slip upload notification', () => {
  test('uploadBeanOrderSlip schedules the same payment notification as confirm', () => {
    const source = fs.readFileSync(ACTIONS, 'utf8');
    const upload = extractFunctionSource(source, 'uploadBeanOrderSlip');
    expect(upload).toContain('scheduleBeanOrderPaymentNotification');
    expect(upload).toContain('recipient_name, total_baht, bean_customers(name)');
  });

  test('confirmBeanOrderPayment uses shared payment notification scheduler', () => {
    const source = fs.readFileSync(ACTIONS, 'utf8');
    const confirm = extractFunctionSource(source, 'confirmBeanOrderPayment');
    expect(confirm).toContain('scheduleBeanOrderPaymentNotification');
    expect(confirm).not.toMatch(/notifyBeanOrderPaymentConfirmed[\s\S]*after\(/);
  });
});
