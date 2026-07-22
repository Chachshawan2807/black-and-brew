import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  computeFieldChanges,
  formatNotificationActorLabel,
  resolveActorLabel,
} from '@/lib/data-change-log';

const mockGet = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();
const { mockAfter } = vi.hoisted(() => ({
  mockAfter: vi.fn((callback: () => void | Promise<void>) => {
    void callback();
  }),
}));

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

vi.mock('next/server', () => ({
  after: mockAfter,
}));

vi.mock('@/lib/session-revocation', () => ({
  isSessionFingerprintRevoked: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/web-push', () => ({
  dispatchInventoryWebPush: vi.fn().mockResolvedValue({ sent: 0, failed: 0, skipped: true }),
  rowToDataChangeLogRow: vi.fn((row: Record<string, unknown>) => row),
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
import { dispatchInventoryWebPush } from '@/lib/web-push';

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

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

describe('resolveActorLabel', () => {
  test('prefers email when available', () => {
    expect(resolveActorLabel('full', 'admin@example.com')).toBe('admin@example.com');
  });

  test('shows editor role with OS for full access PIN users', () => {
    expect(resolveActorLabel('full', null, ANDROID_UA)).toBe('ผู้แก้ไข (Android)');
    expect(resolveActorLabel('full', null, IOS_UA)).toBe('ผู้แก้ไข (iOS)');
  });

  test('falls back to editor without OS when user agent is missing', () => {
    expect(resolveActorLabel('full')).toBe('ผู้แก้ไข');
  });

  test('keeps read-only and system labels unchanged', () => {
    expect(resolveActorLabel('read_only', null, ANDROID_UA)).toBe('ผู้ใช้งาน (อ่านอย่างเดียว)');
    expect(resolveActorLabel('system')).toBe('ระบบ');
  });
});

describe('formatNotificationActorLabel', () => {
  test('reformats legacy full-access labels using user agent', () => {
    expect(
      formatNotificationActorLabel('ผู้ใช้งาน (สิทธิ์แก้ไข)', 'full', ANDROID_UA),
    ).toBe('ผู้แก้ไข (Android)');
  });

  test('maps legacy label without user agent to editor role', () => {
    expect(formatNotificationActorLabel('ผู้ใช้งาน (สิทธิ์แก้ไข)', 'full')).toBe('ผู้แก้ไข');
  });

  test('keeps email and read-only labels unchanged', () => {
    expect(formatNotificationActorLabel('admin@example.com', 'full', ANDROID_UA)).toBe(
      'admin@example.com',
    );
    expect(formatNotificationActorLabel('ผู้ใช้งาน (อ่านอย่างเดียว)', 'read_only', IOS_UA)).toBe(
      'ผู้ใช้งาน (อ่านอย่างเดียว)',
    );
  });

  test('preserves already-formatted editor label with platform when re-displayed', () => {
    expect(formatNotificationActorLabel('ผู้แก้ไข (Android)', null)).toBe('ผู้แก้ไข (Android)');
    expect(formatNotificationActorLabel('ผู้แก้ไข (iOS)', null, undefined)).toBe('ผู้แก้ไข (iOS)');
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
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: {
        id: 'log-1',
        occurred_at: '2026-06-12T10:00:00.000Z',
        actor_label: 'ผู้ใช้งาน',
        action: 'UPDATE',
        module: 'inventory',
        entity_type: 'inventory_item',
        status: 'success',
        metadata: {},
        field_changes: [],
      },
      error: null,
    });
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
        actor_label: 'ผู้แก้ไข',
        actor_access_level: 'full',
        ip_address: '198.51.100.42',
        user_agent: 'Vitest/1.0',
        status: 'success',
        field_changes: [{ field: 'stock', old_value: 5, new_value: 10 }],
      })
    );
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
  });

  test('auto-computes field_changes from oldValue and newValue when omitted', async () => {
    await recordDataChange({
      action: 'UPDATE',
      module: 'schedule',
      entityType: 'shift',
      entityId: 'shift-1',
      entityLabel: 'กะเช้า',
      oldValue: { status: 'OFF', start_time: '2026-06-10T00:00:00' },
      newValue: { status: 'MORNING', start_time: '2026-06-10T00:00:00' },
      source: 'server_action',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        field_changes: [{ field: 'status', old_value: 'OFF', new_value: 'MORNING' }],
      })
    );
  });

  test('schedules inventory web push with after so serverless does not drop cross-device alerts', async () => {
    await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: 'item-1',
      fieldChanges: [{ field: 'stock', old_value: 0, new_value: 1 }],
      metadata: {
        notificationSource: 'inventory_warehouse_grid',
        clientSessionId: 'android-tab',
      },
    });

    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(dispatchInventoryWebPush).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'log-1',
        module: 'inventory',
      }),
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
          actor_label: 'ผู้แก้ไข',
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
