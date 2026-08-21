import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import {
  applyManagementSaveToRawShifts,
  type ManagementHistoryShiftRow,
} from '@/lib/schedule/mgmt-history';

const shiftActionsPath = path.resolve(__dirname, '../app/actions/shift-actions.ts');
const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);

describe('saveManagementHistoryRange server action contract', () => {
  test('uses bulk delete + insert and defers audit/revalidation', () => {
    const source = fs.readFileSync(shiftActionsPath, 'utf-8');
    const body = source.slice(
      source.indexOf('export async function saveManagementHistoryRange'),
      source.indexOf('export async function fetchRosterData'),
    );

    expect(body).toContain('after(async () => {');
    expect(body).toMatch(/after\(async \(\) => \{[\s\S]*recordDataChange/);
    expect(body).toMatch(/after\(async \(\) => \{[\s\S]*revalidateAppPaths/);
    expect(body).toMatch(/\.delete\(\)[\s\S]*\.in\('start_time'/);
    expect(body).toMatch(/\.insert\(newShifts\)/);
    expect(body).not.toMatch(/await revalidateAppPaths\(\);\s*return \{ success: true/);
  });

  test('deleteManagementHistoryRange defers audit log and revalidation', () => {
    const source = fs.readFileSync(shiftActionsPath, 'utf-8');
    const body = source.slice(
      source.indexOf('export async function deleteManagementHistoryRange'),
      source.indexOf('export async function fetchRosterData'),
    );

    expect(body).toContain('after(async () => {');
    expect(body).toMatch(/after\(async \(\) => \{[\s\S]*recordDataChange/);
    expect(body).toMatch(/after\(async \(\) => \{[\s\S]*revalidateAppPaths/);
    expect(body).not.toMatch(/await revalidateAppPaths\(\);\s*return \{ success: true/);
  });
});

describe('handleSaveManagement client flow', () => {
  test('uses saveManagementHistoryRange instead of client-side supabase writes', () => {
    const source = fs.readFileSync(scheduleClientPath, 'utf-8');
    const body = source.slice(
      source.indexOf('const handleSaveManagement = async () =>'),
      source.indexOf('const sensors = useSafeDndSensors()'),
    );

    expect(body).toContain('saveManagementHistoryRange');
    expect(body).not.toMatch(/supabase\.from\('shifts'\)[\s\S]*\.insert\(newShifts\)/);
    expect(body).not.toContain('await revalidateAppPaths()');
    expect(body).not.toContain('fetchMgmtHistory({ reset: true })');
  });
});

describe('applyManagementSaveToRawShifts', () => {
  const baseShift = (
    id: string,
    employeeId: string,
    date: string,
    location = 'ลา',
  ): ManagementHistoryShiftRow => ({
    id,
    employee_id: employeeId,
    start_time: `${date}T00:00:00`,
    end_time: `${date}T23:59:59`,
    status: 'on_leave',
    metadata: { location, is_management: true, remark: 'note' },
    profiles: { full_name: 'Test User' },
  });

  test('replaces employee shifts in the saved date range without refetching', () => {
    const existing = [
      baseShift('old-1', 'emp-1', '2026-08-10'),
      baseShift('keep-1', 'emp-2', '2026-08-10'),
      baseShift('old-2', 'emp-1', '2026-08-11'),
    ];
    const inserted = [
      baseShift('new-1', 'emp-1', '2026-08-11'),
      baseShift('new-2', 'emp-1', '2026-08-12'),
    ];

    const next = applyManagementSaveToRawShifts(existing, {
      employeeId: 'emp-1',
      startDate: '2026-08-11',
      endDate: '2026-08-12',
      previousRange: {
        employeeId: 'emp-1',
        startDate: '2026-08-10',
        endDate: '2026-08-11',
      },
      inserted,
    });

    expect(next.map((shift) => shift.id)).toEqual(['keep-1', 'new-1', 'new-2']);
  });
});
