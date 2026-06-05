import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AI Inventory Analysis Rules', () => {
  test('uses the same low-stock rule as the purchase order UI', () => {
    const routeCode = fs.readFileSync(
      path.resolve(__dirname, '../app/api/chat/route.ts'),
      'utf-8'
    );

    expect(routeCode).toContain('stock <= order_point');
    expect(routeCode).toContain('target_stock > stock');
  });

  test('allows readTable to fetch a full inventory table instead of defaulting to 50 rows', () => {
    const toolCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/tools/database-tools.ts'),
      'utf-8'
    );

    expect(toolCode).toContain('default(500)');
    expect(toolCode).toContain('max(500)');
  });

  test('documents low-stock evaluation with inclusive threshold and target-stock guard', () => {
    const rulesCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/agents/executive-rules.ts'),
      'utf-8'
    );

    expect(rulesCode).toContain('stock <= order_point');
    expect(rulesCode).toContain('target_stock > stock');
  });
});
