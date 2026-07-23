import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockFrom = vi.fn();
const mockGateMutation = vi.fn();

vi.mock('@/lib/policies/server-gate', () => ({
  gateMutation: () => mockGateMutation(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

describe('app preferences actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGateMutation.mockResolvedValue({ success: true });
    process.env.NEXT_PUBLIC_STORE_BRANCH_ID = 'main';
  });

  test('getSidebarMenuOrder returns parsed order from app_preferences', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { sidebar_menu_order: ['sales', 'home'], updated_at: '2026-07-24T00:00:00.000Z' },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const { getSidebarMenuOrder } = await import('@/app/actions/app-preferences-actions');
    const result = await getSidebarMenuOrder();

    expect(result).toEqual({
      success: true,
      orderIds: ['sales', 'home'],
      updatedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(mockFrom).toHaveBeenCalledWith('app_preferences');
    expect(eq).toHaveBeenCalledWith('branch_id', 'main');
  });

  test('saveSidebarMenuOrder upserts branch order for authorized sessions', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    const { saveSidebarMenuOrder } = await import('@/app/actions/app-preferences-actions');
    const result = await saveSidebarMenuOrder(['inventory', 'home']);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.updatedAt).toBeTruthy();
    }
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        branch_id: 'main',
        sidebar_menu_order: ['inventory', 'home'],
      }),
      { onConflict: 'branch_id' },
    );
  });

  test('saveSidebarMenuOrder rejects unauthorized mutations', async () => {
    mockGateMutation.mockResolvedValue({ success: false, error: 'read only' });

    const { saveSidebarMenuOrder } = await import('@/app/actions/app-preferences-actions');
    const result = await saveSidebarMenuOrder(['inventory', 'home']);

    expect(result).toEqual({ success: false, error: 'read only' });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
