import { describe, expect, test, vi, beforeEach } from 'vitest';
import { computeFieldChanges, resolveActorLabel } from '@/lib/data-change-log';

const mockGet = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: mockGet,
  })),
  headers: vi.fn().mockImplementation(async () => ({
    get: (name: string) => {
      if (name === 'x-forwarded-for') return '198.51.100.42';
      if (name === 'user-agent') return 'Vitest/1.0';
      return null;
    },
  })),
}));

vi.mock('@/lib/session-revocation', () => ({
  isSessionFingerprintRevoked: vi.fn().mockResolvedValue(false),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
    })),
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

import { recordDataChange, fetchDataChangeLogs } from '@/app/actions/data-change-log-actions';

describe('computeFieldChanges', () => {
  test('detects changed fields and redacts sensitive keys', () => {
    const changes = computeFieldChanges(
      { name: 'Espresso', pin: '1234', stock: 5 },
      { name: 'Latte', pin: '5678', stock: 5 }
    );

    expect(changes).toEqual([
      { field: 'name', old_value: 'Espresso', new_value: 'Latte' },
    ]);
    expect(changes.some((c) => c.field === 'pin')).toBe(false);
  });
});

describe('resolveActorLabel', () => {
  test('prefers email when available', () => {
    expect(resolveActorLabel('full', 'admin@example.com')).toBe('admin@example.com');
  });
});

describe('recordDataChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      if (name === 'bb_auth_read_only') return undefined;
      return undefined;
    });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  test('rejects unauthenticated callers', async () => {
    mockGet.mockReturnValue(undefined);

    const result = await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: 'item-1',
    });

    expect(result).toEqual({ success: false });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('inserts audit row with actor and request context', async () => {
    await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: 'item-1',
      entityLabel: 'กาแฟ',
      fieldChanges: [{ field: 'stock', old_value: 5, new_value: 10 }],
      source: 'server_action',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        module: 'inventory',
        entity_type: 'inventory_item',
        entity_id: 'item-1',
        entity_label: 'กาแฟ',
        actor_label: 'ผู้ใช้งาน (สิทธิ์แก้ไข)',
        actor_access_level: 'full',
        ip_address: '198.51.100.42',
        user_agent: 'Vitest/1.0',
        status: 'success',
      })
    );
  });
});

describe('fetchDataChangeLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockGet.mockImplementation((name: string) => {
      if (name === 'bb_auth_pin_verified') return { value: 'true' };
      return undefined;
    });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'log-1',
          occurred_at: '2026-06-12T10:00:00.000Z',
          actor_label: 'ผู้ใช้งาน (สิทธิ์แก้ไข)',
          action: 'UPDATE',
          module: 'inventory',
          entity_type: 'inventory_item',
          entity_label: 'กาแฟ',
          field_changes: [],
          status: 'success',
        },
      ],
      error: null,
    });
  });

  test('requires authentication', async () => {
    mockGet.mockReturnValue(undefined);
    const result = await fetchDataChangeLogs();
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  test('returns rows when authenticated', async () => {
    const result = await fetchDataChangeLogs({ limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].module).toBe('inventory');
    }
  });

  test('filters by module when provided', async () => {
    mockLimit.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: [], error: null });

    await fetchDataChangeLogs({ module: 'schedule' });

    expect(mockEq).toHaveBeenCalledWith('module', 'schedule');
  });
});
