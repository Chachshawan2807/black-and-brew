import { describe, expect, test } from 'vitest';
import {
  resolveSecretaryBoardSyncPlan,
  tablesToSyncScopes,
} from '@/lib/secretary/board-sync-scope';

describe('secretary board sync scope', () => {
  test('maps inventory tables to inventory scope', () => {
    expect(tablesToSyncScopes(['inventory_items'])).toEqual(['inventory']);
    expect(tablesToSyncScopes(['inventory_branch_withdrawals'])).toEqual(['inventory']);
  });

  test('resolves light sync for operational_tasks only', () => {
    expect(resolveSecretaryBoardSyncPlan(['operational_tasks'])).toEqual({
      kind: 'light',
      scopes: ['tasks'],
    });
  });

  test('resolves light sync for single data domain (manual board only)', () => {
    expect(resolveSecretaryBoardSyncPlan(['bean_orders'])).toEqual({
      kind: 'light',
      scopes: ['tasks'],
    });
  });

  test('resolves light sync when multiple data domains change', () => {
    expect(resolveSecretaryBoardSyncPlan(['inventory_items', 'bean_orders'])).toEqual({
      kind: 'light',
      scopes: ['tasks'],
    });
  });

  test('resolves full sync when forced or empty', () => {
    expect(resolveSecretaryBoardSyncPlan([], { forceFull: true })).toEqual({
      kind: 'full',
      scopes: [],
    });
    expect(resolveSecretaryBoardSyncPlan([])).toEqual({
      kind: 'full',
      scopes: [],
    });
  });

  test('resolves full sync when tasks and inventory change together', () => {
    expect(resolveSecretaryBoardSyncPlan(['operational_tasks', 'inventory_items'])).toEqual({
      kind: 'full',
      scopes: [],
    });
  });
});
