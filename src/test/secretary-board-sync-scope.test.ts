import { describe, expect, test } from 'vitest';
import {
  resolveSecretaryBoardSyncDebounceMs,
  resolveSecretaryBoardSyncPlan,
  SECRETARY_BOARD_SYNC_DEBOUNCE_LIGHT_MS,
  SECRETARY_BOARD_SYNC_DEBOUNCE_MS,
  SECRETARY_BOARD_SYNC_DEBOUNCE_SCOPED_MS,
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

  test('resolves scoped sync for a single data domain', () => {
    expect(resolveSecretaryBoardSyncPlan(['bean_orders'])).toEqual({
      kind: 'scoped',
      scopes: ['bean_orders'],
    });
  });

  test('resolves scoped sync when multiple data domains change', () => {
    expect(resolveSecretaryBoardSyncPlan(['inventory_items', 'bean_orders'])).toEqual({
      kind: 'scoped',
      scopes: ['inventory', 'bean_orders'],
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

  test('uses shorter debounce for light and scoped realtime plans', () => {
    expect(resolveSecretaryBoardSyncDebounceMs(['operational_tasks'])).toBe(
      SECRETARY_BOARD_SYNC_DEBOUNCE_LIGHT_MS,
    );
    expect(resolveSecretaryBoardSyncDebounceMs(['bean_orders'])).toBe(
      SECRETARY_BOARD_SYNC_DEBOUNCE_SCOPED_MS,
    );
    expect(resolveSecretaryBoardSyncDebounceMs(['inventory_items', 'operational_tasks'])).toBe(
      SECRETARY_BOARD_SYNC_DEBOUNCE_MS,
    );
  });
});
