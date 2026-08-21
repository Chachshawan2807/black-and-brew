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

type DateRangePickerMockProps = {
  startValue?: string;
  endValue?: string;
  onChange?: (range: { start: string; end: string }) => void;
};

vi.mock('@/components/ui/ClickableDateRangePicker', () => ({
  ClickableDateRangePicker: ({ startValue, endValue, onChange }: DateRangePickerMockProps) => (
    <div>
      <input
        aria-label="date-range-start"
        value={startValue || ''}
        onChange={(e) => onChange?.({ start: e.target.value, end: endValue || '' })}
      />
      <input
        aria-label="date-range-end"
        value={endValue || ''}
        onChange={(e) => onChange?.({ start: startValue || '', end: e.target.value })}
      />
    </div>
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
  saveManagementHistoryRange: vi.fn(),
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

  test('renders holiday summary as a 3-column card grid on all viewports', async () => {
    renderSchedule({
      initialProfiles: [
        { id: 'p1', full_name: 'นิด' },
        { id: 'p2', full_name: 'แป้ง' },
        { id: 'p3', full_name: 'มุก' },
      ],
      initialRegularHolidays: { p1: [1, 3], p2: [5], p3: [6, 0] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));

    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    const grid = within(modal).getByTestId('regular-holiday-summary-grid');

    expect(grid.className).toMatch(/grid-cols-3/);
    expect(within(grid).getAllByRole('listitem')).toHaveLength(3);
    expect(within(grid).getByText('นิด')).toBeInTheDocument();
    expect(within(grid).getByText('แป้ง')).toBeInTheDocument();
    expect(within(grid).getByText('มุก')).toBeInTheDocument();
  });

  test('shows all weekly day buttons above the summary without burying the picker on mobile', async () => {
    renderSchedule({
      initialProfiles: [{ id: 'p1', full_name: 'นิด' }],
      initialRegularHolidays: { p1: [1, 2, 0] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    await selectHolidayEmployee('นิด');

    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    const layout = within(modal).getByTestId('regular-holiday-modal-layout');
    const dayPicker = within(modal).getByTestId('regular-holiday-day-picker');

    expect(layout.className).toMatch(/\bflex-col\b/);
    expect(layout.className).not.toMatch(/flex-col-reverse/);

    for (const label of ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']) {
      expect(within(dayPicker).getByRole('button', { name: label })).toBeInTheDocument();
    }

    const summaryHeading = within(modal).getByRole('heading', { name: 'สรุปวันหยุดประจำของพนักงาน' });
    expect(
      dayPicker.compareDocumentPosition(summaryHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('uses an inner scroll region so holiday summary cards are reachable on mobile', async () => {
    renderSchedule({
      initialProfiles: [
        { id: 'p1', full_name: 'นิด' },
        { id: 'p2', full_name: 'แป้ง' },
        { id: 'p3', full_name: 'มุก' },
      ],
      initialRegularHolidays: { p1: [1, 3], p2: [5], p3: [6, 0] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));

    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    const body = within(modal).getByTestId('regular-holiday-modal-scroll');
    const summaryScroll = within(modal).getByTestId('regular-holiday-summary-scroll');

    expect(modal.className).toMatch(/overflow-hidden/);
    expect(modal.className).toMatch(/flex-col/);
    expect(modal.className).toMatch(/max-md:h-\[90dvh\]/);
    expect(body.className).toMatch(/flex-1/);
    expect(body.className).toMatch(/min-h-0/);
    expect(body.className).toMatch(/max-md:overflow-hidden/);
    expect(summaryScroll.className).toMatch(/flex-1/);
    expect(summaryScroll.className).toMatch(/min-h-0/);
    expect(summaryScroll.className).toMatch(/overflow-y-auto/);
    expect(within(summaryScroll).getByTestId('regular-holiday-summary-grid')).toBeInTheDocument();
  });

  test('keeps summary cards scrollable on mobile after selecting an employee', async () => {
    renderSchedule({
      initialProfiles: [
        { id: 'p1', full_name: 'นิด' },
        { id: 'p2', full_name: 'แป้ง' },
        { id: 'p3', full_name: 'มุก' },
        { id: 'p4', full_name: 'เม' },
        { id: 'p5', full_name: 'มีนา' },
        { id: 'p6', full_name: 'ชัช' },
      ],
      initialRegularHolidays: {
        p1: [1, 2, 0],
        p2: [6, 0],
        p3: [6, 0],
        p4: [1, 2],
        p5: [5, 6],
        p6: [1, 2],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    await selectHolidayEmployee('นิด');

    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    const layout = within(modal).getByTestId('regular-holiday-modal-layout');
    const summaryScroll = within(modal).getByTestId('regular-holiday-summary-scroll');

    expect(layout.className).toMatch(/max-md:flex-1/);
    expect(layout.className).toMatch(/max-md:min-h-0/);
    expect(summaryScroll.className).toMatch(/flex-1/);
    expect(summaryScroll.className).toMatch(/overflow-y-auto/);
    expect(within(modal).getByTestId('regular-holiday-modal-footer')).toBeInTheDocument();
    expect(within(summaryScroll).getByText('ชัช')).toBeInTheDocument();
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

  async function selectHolidayEmployee(name: string) {
    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    fireEvent.click(within(modal).getByRole('button', { name: 'เลือกพนักงาน...' }));
    fireEvent.click(await screen.findByRole('option', { name }));
  }

  function clickSaveHoliday() {
    const modal = screen.getByRole('dialog', { name: 'จัดการวันหยุดประจำ' });
    const footer = within(modal).getByTestId('regular-holiday-modal-footer');
    fireEvent.click(within(footer).getByRole('button', { name: 'บันทึกข้อมูล' }));
  }

  test('saves recurring holidays to the server and updates the cache after success', async () => {
    saveRegularHolidaysMock.mockResolvedValue({ success: true, data: [1, 3, 5] });

    renderSchedule({
      initialProfiles: [{ id: 'p1', full_name: 'นิด' }],
      initialRegularHolidays: { p1: [1, 3] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'วันหยุดประจำ' }));
    await selectHolidayEmployee('นิด');
    fireEvent.click(screen.getByRole('button', { name: 'ศ.' }));
    clickSaveHoliday();

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
    await selectHolidayEmployee('นิด');
    fireEvent.click(screen.getByRole('button', { name: 'ศ.' }));
    clickSaveHoliday();

    expect(saveRegularHolidaysMock).toHaveBeenCalledWith('p1', [1, 3, 5]);
    expect(await screen.findByText('จ., พ.')).toBeInTheDocument();
    expect(screen.queryByText('จ., พ., ศ.')).not.toBeInTheDocument();
  });
});
