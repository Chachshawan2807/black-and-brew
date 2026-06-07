import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, layoutId, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('@/components/ui/ClickableDatePicker', () => ({
  ClickableDatePicker: ({ value, onChange }: any) => (
    <input aria-label="date-picker" value={value || ''} onChange={onChange} />
  ),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCorners: vi.fn(),
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: any[]) => items,
  SortableContext: ({ children }: any) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: () => '',
    },
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/app/actions/shift-actions', () => ({
  deleteShift: vi.fn(),
  revalidateAppPaths: vi.fn(),
  updateStaffOrder: vi.fn(),
  saveShift: vi.fn(),
  deleteManagementHistoryRange: vi.fn(),
}));

const saveRegularHolidaysMock = vi.fn();

vi.mock('@/app/actions/holiday-actions', () => ({
  syncHolidays: vi.fn(),
  saveRegularHolidays: (...args: any[]) => saveRegularHolidaysMock(...args),
}));

import ScheduleClient from '@/app/[locale]/schedule/ScheduleClient';

describe('ScheduleClient regular holiday persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    saveRegularHolidaysMock.mockReset();
    saveRegularHolidaysMock.mockResolvedValue({ success: true, data: [1, 3] });
    vi.stubGlobal('alert', vi.fn());
  });

  test('shows regular holiday data from the server on first render', async () => {
    render(
      <ScheduleClient
        initialProfiles={[{ id: 'p1', full_name: 'นิด' }]}
        initialShifts={[]}
        initialHolidays={[]}
        initialRegularHolidays={{ p1: [1, 3] }}
        initialDateStr="2026-06-01"
        locale="th"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));

    expect(screen.getByRole('heading', { name: 'จัดการวันหยุดประจำ' })).toBeInTheDocument();
    expect(screen.getByText('จ., พ.')).toBeInTheDocument();
  });

  test('shows all-employee holiday overview without selecting an employee', async () => {
    render(
      <ScheduleClient
        initialProfiles={[
          { id: 'p1', full_name: 'นิด' },
          { id: 'p2', full_name: 'แป้ง' },
        ]}
        initialShifts={[]}
        initialHolidays={[]}
        initialRegularHolidays={{ p1: [1, 3], p2: [5] }}
        initialDateStr="2026-06-01"
        locale="th"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));

    const modal = screen.getByRole('heading', { name: 'จัดการวันหยุดประจำ' }).closest('.bb-sheet-panel') as HTMLElement;
    const summary = within(modal).getByRole('heading', { name: 'สรุปวันหยุดประจำของพนักงาน' }).parentElement as HTMLElement;

    expect(within(summary).getByText('นิด')).toBeInTheDocument();
    expect(within(summary).getByText('แป้ง')).toBeInTheDocument();
    expect(within(summary).getByText('จ., พ.')).toBeInTheDocument();
    expect(within(summary).getByText('ศ.')).toBeInTheDocument();
    expect(within(modal).getByDisplayValue('เลือกพนักงาน...')).toBeInTheDocument();
  });

  test('migrates cached recurring holidays into Supabase when the server is empty', async () => {
    localStorage.setItem('blackandbrew-regular-holidays', JSON.stringify({ p1: [1, 3] }));

    render(
      <ScheduleClient
        initialProfiles={[{ id: 'p1', full_name: 'นิด' }]}
        initialShifts={[]}
        initialHolidays={[]}
        initialRegularHolidays={{}}
        initialDateStr="2026-06-01"
        locale="th"
      />
    );

    await waitFor(() => {
      expect(saveRegularHolidaysMock).toHaveBeenCalledWith('p1', [1, 3]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    expect(await screen.findByText('จ., พ.')).toBeInTheDocument();
  });

  test('saves recurring holidays to the server and updates the cache after success', async () => {
    saveRegularHolidaysMock.mockResolvedValue({ success: true, data: [1, 3, 5] });

    render(
      <ScheduleClient
        initialProfiles={[{ id: 'p1', full_name: 'นิด' }]}
        initialShifts={[]}
        initialHolidays={[]}
        initialRegularHolidays={{ p1: [1, 3] }}
        initialDateStr="2026-06-01"
        locale="th"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    fireEvent.change(screen.getByDisplayValue('เลือกพนักงาน...'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'ศ.' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูล' }));

    expect(saveRegularHolidaysMock).toHaveBeenCalledWith('p1', [1, 3, 5]);
    expect(await screen.findByText('จ., พ., ศ.')).toBeInTheDocument();
    expect(localStorage.getItem('blackandbrew-regular-holidays')).toContain('"p1":[1,3,5]');
  });

  test('keeps the previous recurring holidays when the server save fails', async () => {
    saveRegularHolidaysMock.mockResolvedValue({ success: false, error: 'network issue' });

    render(
      <ScheduleClient
        initialProfiles={[{ id: 'p1', full_name: 'นิด' }]}
        initialShifts={[]}
        initialHolidays={[]}
        initialRegularHolidays={{ p1: [1, 3] }}
        initialDateStr="2026-06-01"
        locale="th"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    fireEvent.change(screen.getByDisplayValue('เลือกพนักงาน...'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'ศ.' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูล' }));

    expect(saveRegularHolidaysMock).toHaveBeenCalledWith('p1', [1, 3, 5]);
    expect(await screen.findByText('จ., พ.')).toBeInTheDocument();
    expect(screen.queryByText('จ., พ., ศ.')).not.toBeInTheDocument();
  });
});
