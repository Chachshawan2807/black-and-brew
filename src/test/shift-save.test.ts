import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const shiftActionsPath = path.resolve(__dirname, '../app/actions/shift-actions.ts');
const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);

describe('saveShift persistence', () => {
  test('saveShift replaces employee/day slot via delete then insert (no upsert onConflict)', () => {
    const source = fs.readFileSync(shiftActionsPath, 'utf-8');
    const saveShiftBody = source.slice(
      source.indexOf('export async function saveShift'),
      source.indexOf('export async function deleteManagementHistoryRange'),
    );

    expect(saveShiftBody).not.toContain("onConflict: 'employee_id,start_time'");
    expect(saveShiftBody).toMatch(/\.delete\(\)[\s\S]*\.eq\('employee_id'/);
    expect(saveShiftBody).toMatch(/\.insert\([\s\S]*\)[\s\S]*\.select\(\)/);
  });

  test('saveShift refreshes daily schedule notifications for the edited date', () => {
    const source = fs.readFileSync(shiftActionsPath, 'utf-8');
    const saveShiftBody = source.slice(
      source.indexOf('export async function saveShift'),
      source.indexOf('export async function deleteManagementHistoryRange'),
    );

    expect(saveShiftBody).toContain('scheduleDailyReportRefreshForDate');
  });

  test('handleSave surfaces server errors to the user', () => {
    const source = fs.readFileSync(scheduleClientPath, 'utf-8');
    expect(source).toMatch(/\[handleSave\] Server action failed[\s\S]*alert\(/);
  });
});

describe('saveShift server action', () => {
  const mockMaybeSingle = vi.fn();
  const mockDeleteSecondEq = vi.fn();
  const mockDeleteFirstEq = vi.fn();
  const mockSelectSecondEq = vi.fn();
  const mockSelectFirstEq = vi.fn();
  const mockInsertSingle = vi.fn();
  const mockInsertSelect = vi.fn();
  const mockDelete = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockDeleteSecondEq.mockResolvedValue({ error: null });
    mockDeleteFirstEq.mockReturnValue({ eq: mockDeleteSecondEq });
    mockDelete.mockReturnValue({ eq: mockDeleteFirstEq });

    mockSelectSecondEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelectFirstEq.mockReturnValue({ eq: mockSelectSecondEq });
    mockSelect.mockReturnValue({ eq: mockSelectFirstEq });

    mockInsertSingle.mockResolvedValue({
      data: {
        id: 'shift-1',
        employee_id: 'emp-1',
        start_time: '2026-08-11T00:00:00',
        end_time: '2026-08-11T23:59:59',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
      error: null,
    });
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
    mockInsert.mockReturnValue({ select: mockInsertSelect });
  });

  test('persists a new shift for an employee/day slot', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({
        get: (name: string) =>
          name === 'bb_auth_pin_verified' ? { value: 'true' } : undefined,
      }),
    }));
    vi.doMock('next/cache', () => ({
      unstable_noStore: vi.fn(),
      revalidatePath: vi.fn(),
    }));
    vi.doMock('next/server', async (importOriginal) => {
      const actual = await importOriginal<typeof import('next/server')>();
      return {
        ...actual,
        after: vi.fn(() => {}),
      };
    });
    vi.doMock('@/lib/session-revocation', () => ({
      isSessionFingerprintRevoked: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('@/app/actions/data-change-log-actions', () => ({
      recordDataChange: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.doMock('@/lib/proactive-insights/schedule-evaluation', () => ({
      scheduleProactiveInsightEvaluation: vi.fn(),
    }));
    vi.doMock('@/lib/daily-report-notification', () => ({
      refreshDailyReportNotificationsForDate: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: mockSelect,
          delete: mockDelete,
          insert: mockInsert,
        })),
      })),
    }));

    const { saveShift } = await import('@/app/actions/shift-actions');
    const result = await saveShift({
      employee_id: 'emp-1',
      start_time: '2026-08-11T00:00:00',
      end_time: '2026-08-11T23:59:59',
      status: 'scheduled',
      metadata: { location: '6:30' },
    });

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertSingle).toHaveBeenCalled();
  }, 15_000);
});
