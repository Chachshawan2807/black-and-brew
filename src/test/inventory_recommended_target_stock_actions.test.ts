import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('inventory recommended target stock actions', () => {
  test('server action fetches recommendation inputs from OUT transactions and holidays', () => {
    const actions = read('src/app/actions/inventory-actions.ts');

    expect(actions).toContain('fetchInventoryTargetRecommendations');
    expect(actions).toContain('computeInventoryTargetRecommendation');
    expect(actions).toContain(".from('inventory_transactions')");
    expect(actions).toContain(".eq('type', 'OUT')");
    expect(actions).toContain(".from('holidays')");
    expect(actions).toContain('shortage_risk, lead_time_days');
  });

  test('server action returns recommendations keyed by item id and logs Supabase errors', () => {
    const actions = read('src/app/actions/inventory-actions.ts');

    expect(actions).toContain('recommendationsByItemId');
    expect(actions).toContain('[fetchInventoryTargetRecommendations] Supabase Error:');
    expect(actions).toContain('recommendation_explanation');
    expect(actions).toContain('recommendation_confidence');
  });
});
