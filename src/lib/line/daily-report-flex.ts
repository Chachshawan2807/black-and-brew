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

export type DailyReportFlexMessage = {
  type: 'flex';
  altText: string;
  contents: {
    type: 'bubble';
    size: 'mega';
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

function shiftBadge(shiftText: string): FlexBox {
  const palette = getShiftFlexPalette(shiftText);
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: shiftText,
        size: 'xs',
        weight: 'bold',
        color: FLEX_BODY_TEXT,
        align: 'center',
      },
    ],
    backgroundColor: palette.backgroundColor,
    borderColor: palette.borderColor,
    borderWidth: '1px',
    cornerRadius: '8px',
    paddingAll: '6px',
    paddingStart: '10px',
    paddingEnd: '10px',
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
        text: name,
        size: 'sm',
        color: FLEX_BODY_TEXT,
        flex: 4,
        wrap: true,
      },
      shiftBadge(shiftText),
    ],
    spacing: 'sm',
    alignItems: 'center',
    margin: 'sm',
  };
}

function sectionTitle(label: string): FlexText {
  return {
    type: 'text',
    text: label,
    size: 'xs',
    weight: 'bold',
    color: FLEX_MUTED_TEXT,
    margin: 'md',
  };
}

function buildStaffSection(
  title: string,
  staff: DailyReportData['activeStaff'],
): FlexComponent[] {
  if (staff.length === 0) return [];
  return [sectionTitle(title), ...staff.map((s) => staffRow(s.name, s.shiftText))];
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
    `เข้ากะ ${data.headcount} คน`,
    timedSummary || undefined,
    otherDutySummary ? `งานอื่น: ${otherDutySummary}` : undefined,
    offSummary ? `หยุด: ${offSummary}` : undefined,
    data.holiday
      ? `วันหยุดถัดไป: ${data.holiday.name} (อีก ${data.holiday.daysRemaining} วัน)`
      : undefined,
  ].filter(Boolean);

  return truncate(parts.join(' · '), 400);
}

function buildWorkingSection(data: DailyReportData): FlexComponent[] {
  const hasTimed = data.activeStaff.length > 0;
  const hasOtherDuty = data.otherDutyStaff.length > 0;

  if (!hasTimed && !hasOtherDuty) return [];

  const contents: FlexComponent[] = [sectionTitle('เข้างาน')];

  if (hasTimed) {
    contents.push(...data.activeStaff.map((s) => staffRow(s.name, s.shiftText)));
  }

  if (hasOtherDuty) {
    if (hasTimed) {
      contents.push({ type: 'separator', margin: 'md', color: '#e5e7eb' });
    }
    contents.push(...data.otherDutyStaff.map((s) => staffRow(s.name, s.shiftText)));
  }

  return contents;
}

export function buildDailyReportFlexMessage(data: DailyReportData): DailyReportFlexMessage {
  const bodyContents: FlexComponent[] = [
    {
      type: 'text',
      text: `เข้ากะ ${data.headcount} คน`,
      size: 'sm',
      weight: 'bold',
      color: FLEX_BODY_TEXT,
    },
    ...buildWorkingSection(data),
  ];

  if (data.offStaff.length > 0) {
    if (data.activeStaff.length > 0 || data.otherDutyStaff.length > 0) {
      bodyContents.push({ type: 'separator', margin: 'lg', color: '#e5e7eb' });
    }
    bodyContents.push(...buildStaffSection('ไม่เข้ากะ', data.offStaff));
  }

  if (
    data.activeStaff.length === 0 &&
    data.otherDutyStaff.length === 0 &&
    data.offStaff.length === 0
  ) {
    bodyContents.push({
      type: 'text',
      text: 'ไม่มีข้อมูลพนักงานในระบบ',
      size: 'sm',
      color: FLEX_MUTED_TEXT,
      margin: 'md',
    });
  }

  const holidayText = data.holiday
    ? truncate(`${data.holiday.name} (อีก ${data.holiday.daysRemaining} วัน)`, 120)
    : 'ไม่มีข้อมูลวันหยุดในระบบ';

  return {
    type: 'flex',
    altText: buildDailyReportAltText(data),
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: FLEX_HEADER_PALETTE.backgroundColor,
        borderColor: FLEX_HEADER_PALETTE.borderColor,
        borderWidth: '1px',
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: 'Bru AI · ตารางงาน',
            size: 'xs',
            color: FLEX_MUTED_TEXT,
          },
          {
            type: 'text',
            text: data.dateStr,
            size: 'xl',
            weight: 'bold',
            color: FLEX_BODY_TEXT,
            margin: 'xs',
          },
          {
            type: 'text',
            text: scheduleLabel(data.schedule),
            size: 'sm',
            color: FLEX_MUTED_TEXT,
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'none',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: FLEX_HOLIDAY_PALETTE.backgroundColor,
        borderColor: FLEX_HOLIDAY_PALETTE.borderColor,
        borderWidth: '1px',
        cornerRadius: '12px',
        margin: 'md',
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: 'วันหยุดนักขัตฤกษ์ถัดไป',
            size: 'xs',
            weight: 'bold',
            color: FLEX_MUTED_TEXT,
          },
          {
            type: 'text',
            text: holidayText,
            size: 'sm',
            color: FLEX_BODY_TEXT,
            wrap: true,
            margin: 'xs',
          },
        ],
      },
    },
  };
}
