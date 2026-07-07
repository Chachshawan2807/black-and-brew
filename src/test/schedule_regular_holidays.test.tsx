import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AppTooltipProvider } from '@/components/providers/AppTooltipProvider';
import type { RegularHolidayMap } from '@/lib/regular-holidays';
import type { Profile, Shift } from '@/types';

type MotionDivProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
  layout?: unknown;
  layoutId?: unknown;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
};

type DatePickerMockProps = {
  value?: string | null;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

type ScheduleHoliday = { id: string; date: string; name: string };

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: MotionDivProps) => {
      const domProps = { ...props };
      delete domProps.layout;
      delete domProps.layoutId;
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.exit;
      delete domProps.transition;

      return <div {...domProps}>{children}</div>;
    },
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
  ClickableDatePicker: ({ value, onChange }: DatePickerMockProps) => (
    <input aria-label="date-picker" value={value || ''} onChange={onChange} />
  ),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  closestCorners: vi.fn(),
  KeyboardSensor: function KeyboardSensor() {},
  MouseSensor: function MouseSensor() {},
  TouchSensor: function TouchSensor() {},
  PointerSensor: function PointerSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: <T,>(items: T[]) => items,
  SortableContext: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
  batchUpdateProfileNames: vi.fn().mockResolvedValue({ success: true }),
  saveShift: vi.fn(),
  deleteManagementHistoryRange: vi.fn(),
}));

const saveRegularHolidaysMock = vi.fn();

vi.mock('@/app/actions/holiday-actions', () => ({
  syncHolidays: vi.fn(),
  saveRegularHolidays: (...args: unknown[]) => saveRegularHolidaysMock(...args),
}));

import ScheduleClient from '@/app/[locale]/schedule/ScheduleClient';

// ── Shared props type ─────────────────────────────────────────────────────────
interface ScheduleProps {
  initialProfiles: Profile[];
  initialShifts?: Shift[];
  initialHolidays?: ScheduleHoliday[];
  initialRegularHolidays: RegularHolidayMap;
  initialDateStr?: string;
  locale?: string;
}

function renderSchedule(props: ScheduleProps) {
  const {
    initialShifts = [],
    initialHolidays = [],
    initialDateStr = '2026-06-01',
    locale = 'th',
    ...rest
  } = props;
  return render(
    <AuthProvider isReadOnly={false}>
      <AppTooltipProvider>
        <ScheduleClient
          initialShifts={initialShifts}
          initialHolidays={initialHolidays}
          initialDateStr={initialDateStr}
          locale={locale}
          {...rest}
        />
      </AppTooltipProvider>
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ScheduleClient regular holiday persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    saveRegularHolidaysMock.mockReset();
    saveRegularHolidaysMock.mockResolvedValue({ success: true, data: [1, 3] });
    vi.stubGlobal('alert', vi.fn());
  });

  test('shows regular holiday data from the server on first render', async () => {
    renderSchedule({
      initialProfiles: [{ id: 'p1', full_name: 'นิด' }],
      initialRegularHolidays: { p1: [1, 3] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));

    expect(screen.getByRole('heading', { name: 'จัดการวันหยุดประจำ' })).toBeInTheDocument();
    expect(screen.getByText('จ., พ.')).toBeInTheDocument();
  });

  test('shows all-employee holiday overview without selecting an employee', async () => {
    renderSchedule({
      initialProfiles: [
        { id: 'p1', full_name: 'นิด' },
        { id: 'p2', full_name: 'แป้ง' },
      ],
      initialRegularHolidays: { p1: [1, 3], p2: [5] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));

    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    const summary = within(modal).getByRole('heading', { name: 'สรุปวันหยุดประจำของพนักงาน' }).parentElement as HTMLElement;

    expect(within(summary).getByText('นิด')).toBeInTheDocument();
    expect(within(summary).getByText('แป้ง')).toBeInTheDocument();
    expect(within(summary).getByText('จ., พ.')).toBeInTheDocument();
    expect(within(summary).getByText('ศ.')).toBeInTheDocument();
    expect(within(modal).getByDisplayValue('เลือกพนักงาน...')).toBeInTheDocument();
  });

  test('migrates cached recurring holidays into Supabase when the server is empty', async () => {
    localStorage.setItem('blackandbrew-regular-holidays', JSON.stringify({ p1: [1, 3] }));

    renderSchedule({
      initialProfiles: [{ id: 'p1', full_name: 'นิด' }],
      initialRegularHolidays: {},
    });

    await waitFor(() => {
      expect(saveRegularHolidaysMock).toHaveBeenCalledWith('p1', [1, 3]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    expect(await screen.findByText('จ., พ.')).toBeInTheDocument();
  });

  test('saves recurring holidays to the server and updates the cache after success', async () => {
    saveRegularHolidaysMock.mockResolvedValue({ success: true, data: [1, 3, 5] });

    renderSchedule({
      initialProfiles: [{ id: 'p1', full_name: 'นิด' }],
      initialRegularHolidays: { p1: [1, 3] },
    });

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

    renderSchedule({
      initialProfiles: [{ id: 'p1', full_name: 'นิด' }],
      initialRegularHolidays: { p1: [1, 3] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    fireEvent.change(screen.getByDisplayValue('เลือกพนักงาน...'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'ศ.' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูล' }));

    expect(saveRegularHolidaysMock).toHaveBeenCalledWith('p1', [1, 3, 5]);
    expect(await screen.findByText('จ., พ.')).toBeInTheDocument();
    expect(screen.queryByText('จ., พ., ศ.')).not.toBeInTheDocument();
  });
});
