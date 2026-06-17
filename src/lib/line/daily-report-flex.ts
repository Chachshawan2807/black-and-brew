import type { DailyReportData } from '@/app/actions/daily-report-actions';
import {
  FLEX_BODY_TEXT,
  FLEX_HEADER_PALETTE,
  FLEX_HOLIDAY_PALETTE,
  FLEX_MUTED_TEXT,
  getShiftFlexPalette,
} from '@/lib/shift-colors';

type FlexText = {
  type: 'text';
  text: string;
  size?: string;
  weight?: string;
  color?: string;
  flex?: number;
  wrap?: boolean;
  margin?: string;
  align?: string;
  gravity?: string;
};

type FlexBox = {
  type: 'box';
  layout: 'vertical' | 'horizontal' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  flex?: number;
  justifyContent?: string;
  alignItems?: string;
};

type FlexSeparator = { type: 'separator'; margin?: string; color?: string };

type FlexComponent = FlexText | FlexBox | FlexSeparator;

const FLEX_SEPARATOR_COLOR = '#e5e7eb';

/** Show public-holiday footer only when the holiday falls within this many days. */
export const HOLIDAY_FOOTER_MAX_DAYS = 14;

/** LINE Flex bubble size — single source of truth for type + payload. */
export const DAILY_REPORT_BUBBLE_SIZE = 'kilo' as const;

export type DailyReportFlexMessage = {
  type: 'flex';
  altText: string;
  contents: {
    type: 'bubble';
    size: typeof DAILY_REPORT_BUBBLE_SIZE;
    header: FlexBox;
    body: FlexBox;
    footer?: FlexBox;
  };
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function scheduleLabel(schedule: DailyReportData['schedule']): string {
  return schedule === 'tomorrow' ? 'พรุ่งนี้' : 'วันนี้';
}

function schedulePill(schedule: DailyReportData['schedule']): FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: scheduleLabel(schedule),
        size: 'xs',
        weight: 'bold',
        color: FLEX_MUTED_TEXT,
        align: 'center',
      },
    ],
    backgroundColor: '#ffffff',
    borderColor: FLEX_HEADER_PALETTE.borderColor,
    borderWidth: '1px',
    cornerRadius: '12px',
    paddingAll: '4px',
    paddingStart: '10px',
    paddingEnd: '10px',
    flex: 0,
  };
}

function headcountBadge(count: number): FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: `${count} คน`,
        size: 'xs',
        weight: 'bold',
        color: FLEX_BODY_TEXT,
        align: 'center',
      },
    ],
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: '1px',
    cornerRadius: '12px',
    paddingAll: '4px',
    paddingStart: '8px',
    paddingEnd: '8px',
    flex: 0,
  };
}

function shiftBadge(shiftText: string): FlexBox {
  const palette = getShiftFlexPalette(shiftText);
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: shiftText,
        size: 'sm',
        weight: 'bold',
        color: FLEX_BODY_TEXT,
        align: 'center',
      },
    ],
    backgroundColor: palette.backgroundColor,
    borderColor: palette.borderColor,
    borderWidth: '1px',
    cornerRadius: '10px',
    paddingAll: '6px',
    paddingStart: '12px',
    paddingEnd: '12px',
    flex: 0,
  };
}

function staffRow(name: string, shiftText: string): FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `◦ ${name}`,
        size: 'md',
        color: FLEX_BODY_TEXT,
        flex: 4,
        wrap: true,
      },
      shiftBadge(shiftText),
    ],
    spacing: 'md',
    alignItems: 'center',
    margin: 'sm',
  };
}

function sectionTitle(headcount: number): FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    alignItems: 'center',
    margin: 'none',
    contents: [
      {
        type: 'text',
        text: '👥',
        size: 'md',
        flex: 0,
      },
      {
        type: 'text',
        text: 'เข้างาน',
        size: 'sm',
        weight: 'bold',
        color: FLEX_BODY_TEXT,
        flex: 0,
      },
      headcountBadge(headcount),
    ],
  };
}

function staffListBox(staff: DailyReportData['activeStaff']): FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    spacing: 'none',
    margin: 'sm',
    contents: staff.map((s) => staffRow(s.name, s.shiftText)),
  };
}

export function shouldShowHolidayFooter(
  holiday: DailyReportData['holiday'],
): boolean {
  return holiday != null && holiday.daysRemaining <= HOLIDAY_FOOTER_MAX_DAYS;
}

function holidayDaysBadge(daysRemaining: number): FlexBox {
  const text = daysRemaining === 0 ? 'วันนี้' : `อีก ${daysRemaining} วัน`;
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text,
        size: 'xs',
        weight: 'bold',
        color: FLEX_BODY_TEXT,
        align: 'center',
      },
    ],
    backgroundColor: FLEX_HOLIDAY_PALETTE.borderColor,
    borderColor: FLEX_HOLIDAY_PALETTE.borderColor,
    borderWidth: '1px',
    cornerRadius: '10px',
    paddingAll: '6px',
    paddingStart: '10px',
    paddingEnd: '10px',
    flex: 0,
  };
}

function formatHolidayName(holiday: NonNullable<DailyReportData['holiday']>): string {
  return truncate(holiday.name, 100);
}

export function buildDailyReportAltText(data: DailyReportData): string {
  const timedSummary = data.activeStaff
    .map((s) => `${s.name} ${s.shiftText}`)
    .join(', ');
  const otherDutySummary = data.otherDutyStaff
    .map((s) => `${s.name} (${s.shiftText})`)
    .join(', ');
  const offSummary = data.offStaff.map((s) => `${s.name} (${s.shiftText})`).join(', ');

  const parts = [
    `ตารางงาน ${data.dateStr} (${scheduleLabel(data.schedule)})`,
    `เข้างาน ${data.headcount} คน`,
    timedSummary || undefined,
    otherDutySummary ? `งานอื่น: ${otherDutySummary}` : undefined,
    offSummary ? `หยุด: ${offSummary}` : undefined,
    shouldShowHolidayFooter(data.holiday)
      ? `วันหยุด: ${data.holiday!.name} (อีก ${data.holiday!.daysRemaining} วัน)`
      : undefined,
  ].filter(Boolean);

  return truncate(parts.join(' · '), 400);
}

function buildWorkingSection(data: DailyReportData): FlexComponent[] {
  const hasTimed = data.activeStaff.length > 0;
  const hasOtherDuty = data.otherDutyStaff.length > 0;

  if (!hasTimed && !hasOtherDuty) return [];

  const contents: FlexComponent[] = [sectionTitle(data.headcount)];

  if (hasTimed) {
    contents.push(staffListBox(data.activeStaff));
  }

  if (hasOtherDuty) {
    if (hasTimed) {
      contents.push({ type: 'separator', margin: 'md', color: FLEX_SEPARATOR_COLOR });
    }
    contents.push(staffListBox(data.otherDutyStaff));
  }

  return contents;
}

function buildHolidayFooter(holiday: NonNullable<DailyReportData['holiday']>): FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: FLEX_HOLIDAY_PALETTE.backgroundColor,
    borderColor: FLEX_HOLIDAY_PALETTE.borderColor,
    borderWidth: '1px',
    cornerRadius: '10px',
    paddingAll: '14px',
    spacing: 'sm',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        alignItems: 'center',
        contents: [
          {
            type: 'text',
            text: '🗓️',
            size: 'lg',
            flex: 0,
          },
          {
            type: 'text',
            text: 'วันหยุดนักขัตฤกษ์',
            size: 'xs',
            weight: 'bold',
            color: FLEX_MUTED_TEXT,
            flex: 1,
          },
          holidayDaysBadge(holiday.daysRemaining),
        ],
      },
      {
        type: 'text',
        text: formatHolidayName(holiday),
        size: 'md',
        weight: 'bold',
        color: FLEX_BODY_TEXT,
        wrap: true,
        margin: 'xs',
      },
    ],
  };
}

function buildHeader(data: DailyReportData): FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    backgroundColor: FLEX_HEADER_PALETTE.backgroundColor,
    borderColor: FLEX_HEADER_PALETTE.borderColor,
    borderWidth: '1px',
    paddingAll: '16px',
    paddingBottom: '14px',
    spacing: 'md',
    alignItems: 'center',
    contents: [
      {
        type: 'text',
        text: '📋',
        size: 'xl',
        flex: 0,
      },
      {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: data.dateStr,
            size: 'xl',
            weight: 'bold',
            color: FLEX_BODY_TEXT,
          },
          schedulePill(data.schedule),
        ],
      },
    ],
  };
}

export function buildDailyReportFlexMessage(data: DailyReportData): DailyReportFlexMessage {
  const bodyContents: FlexComponent[] = [...buildWorkingSection(data)];

  if (data.offStaff.length > 0) {
    if (data.activeStaff.length > 0 || data.otherDutyStaff.length > 0) {
      bodyContents.push({ type: 'separator', margin: 'lg', color: FLEX_SEPARATOR_COLOR });
    }
    bodyContents.push(staffListBox(data.offStaff));
  }

  if (
    data.activeStaff.length === 0 &&
    data.otherDutyStaff.length === 0 &&
    data.offStaff.length === 0
  ) {
    bodyContents.push({
      type: 'text',
      text: '📭 ไม่มีข้อมูลพนักงานในระบบ',
      size: 'sm',
      color: FLEX_MUTED_TEXT,
      margin: 'md',
      align: 'center',
    });
  }

  const message: DailyReportFlexMessage = {
    type: 'flex',
    altText: buildDailyReportAltText(data),
    contents: {
      type: 'bubble',
      size: DAILY_REPORT_BUBBLE_SIZE,
      header: buildHeader(data),
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        paddingTop: '14px',
        spacing: 'sm',
        contents: bodyContents,
      },
    },
  };

  if (shouldShowHolidayFooter(data.holiday)) {
    message.contents.footer = buildHolidayFooter(data.holiday!);
  }

  return message;
}
