export const SECRETARY_REALTIME_TABLES = [
  'operational_tasks',
  'shifts',
  'inventory_items',
  'inventory_branch_withdrawals',
  'bean_orders',
  'bean_order_payments',
  'bean_order_shipments',
  'service_records',
] as const;

export type SecretaryRealtimeTable = (typeof SECRETARY_REALTIME_TABLES)[number];

export type SecretarySyncScope =
  | 'tasks'
  | 'inventory'
  | 'bean_orders'
  | 'maintenance'
  | 'schedule';

export type SecretaryBoardSyncKind = 'full' | 'light' | 'scoped';

export type SecretaryBoardSyncPlan = {
  kind: SecretaryBoardSyncKind;
  scopes: SecretarySyncScope[];
};

export const SECRETARY_BOARD_SYNC_DEBOUNCE_MS = 3_000;

const TABLE_TO_SCOPES: Record<SecretaryRealtimeTable, SecretarySyncScope[]> = {
  operational_tasks: ['tasks'],
  shifts: ['schedule'],
  inventory_items: ['inventory'],
  inventory_branch_withdrawals: ['inventory'],
  bean_orders: ['bean_orders'],
  bean_order_payments: ['bean_orders'],
  bean_order_shipments: ['bean_orders'],
  service_records: ['maintenance'],
};

export function tablesToSyncScopes(tables: Iterable<SecretaryRealtimeTable>): SecretarySyncScope[] {
  const scopes = new Set<SecretarySyncScope>();
  for (const table of tables) {
    for (const scope of TABLE_TO_SCOPES[table]) {
      scopes.add(scope);
    }
  }
  return [...scopes];
}

/** Maps debounced realtime tables to a server sync plan. */
export function resolveSecretaryBoardSyncPlan(
  changedTables: readonly SecretaryRealtimeTable[],
  options?: { forceFull?: boolean },
): SecretaryBoardSyncPlan {
  if (options?.forceFull || changedTables.length === 0) {
    return { kind: 'full', scopes: [] };
  }

  const scopes = tablesToSyncScopes(changedTables);
  const scopeSet = new Set(scopes);

  const onlyTasks = scopeSet.size === 1 && scopeSet.has('tasks');

  if (onlyTasks) {
    return { kind: 'light', scopes: ['tasks'] };
  }

  const dataScopes = scopes.filter(
    (scope): scope is Exclude<SecretarySyncScope, 'tasks'> => scope !== 'tasks',
  );

  if (dataScopes.length >= 1 && !scopeSet.has('tasks')) {
    return { kind: 'light', scopes: ['tasks'] };
  }

  return { kind: 'full', scopes: [] };
}
