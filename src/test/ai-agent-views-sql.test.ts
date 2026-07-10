import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AI agent SQL views', () => {
  test('does not expose inventory history through retired ai-prefixed views', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../sql/ai_agent_views.sql'),
      'utf-8',
    );

    expect(sql).not.toMatch(/CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.ai_/i);
    expect(sql).toContain('public.view_inventory_summary');
    expect(sql).toContain('public.view_today_shifts');
  });

  test('uses security_invoker views and locks RPC search_path', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../sql/ai_agent_views.sql'),
      'utf-8',
    );

    expect(sql).toMatch(/view_today_shifts[\s\S]*security_invoker\s*=\s*true/i);
    expect(sql).toMatch(/view_inventory_summary[\s\S]*security_invoker\s*=\s*true/i);
    expect(sql).toMatch(/get_ai_store_status[\s\S]*SET search_path TO public/i);
    expect(sql).toMatch(/get_ai_inventory_item_details[\s\S]*SET search_path TO public/i);
  });
});
