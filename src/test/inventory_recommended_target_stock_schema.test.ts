import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('inventory recommended target stock schema', () => {
  test('inventory item selects include recommendation settings', () => {
    const queries = read('src/lib/inventory-queries.ts');

    expect(queries).toContain('shortage_risk');
    expect(queries).toContain('lead_time_days');
  });

  test('inventory client item type exposes recommendation settings and transient recommendation fields', () => {
    const types = read('src/app/[locale]/inventory/types.ts');

    expect(types).toContain("shortage_risk?: InventoryShortageRisk");
    expect(types).toContain('lead_time_days?: number');
    expect(types).toContain('recommended_target_stock?: number');
    expect(types).toContain('recommendation_confidence?: InventoryRecommendationConfidence');
  });

  test('database types include persisted recommendation settings', () => {
    const databaseTypes = read('src/lib/database.types.ts');

    expect(databaseTypes).toContain('shortage_risk: string | null');
    expect(databaseTypes).toContain('lead_time_days: number | null');
    expect(databaseTypes).toContain('shortage_risk?: string | null');
    expect(databaseTypes).toContain('lead_time_days?: number | null');
  });

  test('migration adds recommendation settings with a three-level risk check', () => {
    const migrationsDir = path.join(root, 'supabase', 'migrations');
    const migration = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('_inventory_recommended_target_stock.sql'))
      .map((file) => read(path.join('supabase', 'migrations', file)))
      .join('\n');

    expect(migration).toContain('shortage_risk');
    expect(migration).toContain('lead_time_days');
    expect(migration).toContain("'normal'");
    expect(migration).toContain("'medium'");
    expect(migration).toContain("'high'");
    expect(migration).not.toContain("'critical'");
  });
});
