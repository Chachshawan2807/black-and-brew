import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/fonts', () => ({
  APP_FONT_FAMILY_CSS: 'Inter, sans-serif',
  appFontClassName: 'font-inter',
}));

const toBlobMock = vi.fn();
const getFontEmbedCSSMock = vi.fn();

vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => toBlobMock(...args),
  getFontEmbedCSS: (...args: unknown[]) => getFontEmbedCSSMock(...args),
}));

import {
  applyScheduleTableCaptureStyles,
  buildScheduleExportGridTemplate,
  captureScheduleTableAsPng,
  resetScheduleExportCaptureCache,
  SCHEDULE_EXPORT_BG,
  withLightDocumentTheme,
} from '@/lib/schedule-export-capture';

describe('schedule-export-capture', () => {
  beforeEach(() => {
    resetScheduleExportCaptureCache();
    toBlobMock.mockReset();
    getFontEmbedCSSMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    getFontEmbedCSSMock.mockResolvedValue('@font-face { font-family: Prompt; }');
    document.documentElement.classList.remove('dark');
  });

  test('withLightDocumentTheme temporarily removes .dark from html', async () => {
    document.documentElement.classList.add('dark');
    await withLightDocumentTheme(async () => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('applyScheduleTableCaptureStyles skips SVG icon nodes without throwing', () => {
    const root = document.createElement('div');
    root.className = 'text-foreground bg-card';

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'lucide lucide-grip-vertical w-5 h-5');
    root.appendChild(svg);

    expect(() => applyScheduleTableCaptureStyles(root)).not.toThrow();
  });

  test('applyScheduleTableCaptureStyles inlines layout-critical export styles then restores', () => {
    const root = document.createElement('div');
    root.id = 'blackandbrew-schedule-table';

    const grid = document.createElement('div');
    grid.className = 'bb-schedule-grid';
    root.appendChild(grid);

    const nowrap = document.createElement('span');
    nowrap.className = 'bb-schedule-nowrap';
    root.appendChild(nowrap);

    const nameCell = document.createElement('span');
    nameCell.textContent = 'นิต้า';
    root.appendChild(nameCell);

    const restore = applyScheduleTableCaptureStyles(root);
    expect(root.style.fontFamily).toContain('Inter');
    expect(nameCell.style.fontFamily).toContain('Inter');
    expect(grid.style.alignItems).toBe('stretch');
    expect(grid.style.transform).toBe('none');
    expect(nowrap.style.whiteSpace).toBe('nowrap');

    restore();
    expect(root.style.fontFamily).toBe('');
    expect(grid.style.alignItems).toBe('');
    expect(grid.style.transform).toBe('');
    expect(nowrap.style.whiteSpace).toBe('');
  });

  test('buildScheduleExportGridTemplate always uses fixed equal day column widths', () => {
    const root = document.createElement('div');

    const makeRow = (nameWidth: number, dayWidths: number[]) => {
      const grid = document.createElement('div');
      grid.className = 'bb-schedule-grid';

      const name = document.createElement('div');
      name.className = 'bb-schedule-name-cell';
      Object.defineProperty(name, 'getBoundingClientRect', {
        value: () => ({ width: nameWidth }),
      });
      grid.appendChild(name);

      dayWidths.forEach((width) => {
        const day = document.createElement('div');
        Object.defineProperty(day, 'getBoundingClientRect', {
          value: () => ({ width }),
        });
        grid.appendChild(day);
      });

      root.appendChild(grid);
    };

    makeRow(90, [80, 80, 80, 80, 80, 80, 80]);
    makeRow(100, [200, 80, 80, 80, 80, 80, 80]);

    expect(buildScheduleExportGridTemplate(root)).toBe('88px repeat(7, 92px)');
  });

  test('buildScheduleExportGridTemplate ignores long holiday labels and caps day columns', () => {
    const root = document.createElement('div');
    const longHoliday =
      'วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร';

    const holidayGrid = document.createElement('div');
    holidayGrid.className = 'bb-schedule-grid';
    const holidayName = document.createElement('div');
    holidayGrid.appendChild(holidayName);
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('div');
      cell.className = 'bb-schedule-holiday-cell';
      const label = document.createElement('span');
      label.className = 'bb-schedule-holiday-label';
      label.textContent = longHoliday;
      cell.appendChild(label);
      Object.defineProperty(cell, 'getBoundingClientRect', {
        value: () => ({ width: 2400 }),
      });
      Object.defineProperty(cell, 'scrollWidth', { value: 2400 });
      holidayGrid.appendChild(cell);
    }
    root.appendChild(holidayGrid);

    const shiftGrid = document.createElement('div');
    shiftGrid.className = 'bb-schedule-grid';
    const shiftName = document.createElement('div');
    Object.defineProperty(shiftName, 'getBoundingClientRect', {
      value: () => ({ width: 88 }),
    });
    shiftGrid.appendChild(shiftName);
    for (let i = 0; i < 7; i++) {
      const day = document.createElement('div');
      Object.defineProperty(day, 'getBoundingClientRect', {
        value: () => ({ width: 92 }),
      });
      shiftGrid.appendChild(day);
    }
    root.appendChild(shiftGrid);

    const template = buildScheduleExportGridTemplate(root);
    expect(template).toBe('88px repeat(7, 92px)');
  });

  test('applyScheduleTableCaptureStyles hides drag handles and strips shadows for export', () => {
    const root = document.createElement('div');
    root.className = 'bb-schedule-export-surface';

    const dragHandle = document.createElement('div');
    dragHandle.className = 'bb-schedule-drag-handle';
    dragHandle.style.display = 'flex';
    root.appendChild(dragHandle);

    const shiftPill = document.createElement('div');
    shiftPill.className = 'shadow-sm';
    shiftPill.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
    root.appendChild(shiftPill);

    const restore = applyScheduleTableCaptureStyles(root);
    expect(dragHandle.style.display).toBe('none');
    expect(shiftPill.style.boxShadow).toBe('none');

    restore();
    expect(dragHandle.style.display).toBe('flex');
    expect(shiftPill.style.boxShadow).toBe('0 1px 2px 0 rgb(0 0 0 / 0.05)');
  });

  test('applyScheduleTableCaptureStyles shrinks export table to fixed content width', () => {
    const root = document.createElement('div');
    root.style.minWidth = '880px';
    root.style.width = '100%';

    const restore = applyScheduleTableCaptureStyles(root);
    expect(root.style.minWidth).toBe('0px');
    expect(root.style.width).toBe('732px');
    expect(root.style.maxWidth).toBe('732px');

    restore();
    expect(root.style.minWidth).toBe('880px');
    expect(root.style.width).toBe('100%');
  });

  test('applyScheduleTableCaptureStyles draws row dividers on every grid cell', () => {
    const root = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'bb-schedule-grid';
    const nameCell = document.createElement('div');
    nameCell.className = 'bb-schedule-name-cell';
    const dayCell = document.createElement('div');
    grid.append(nameCell, dayCell);
    root.appendChild(grid);

    const restore = applyScheduleTableCaptureStyles(root);
    expect(nameCell.style.borderBottom).toContain('0.1');
    expect(nameCell.style.boxShadow).toContain('inset');
    expect(dayCell.style.borderBottom).toContain('0.1');
    expect(grid.style.borderBottomWidth).toBe('0px');

    restore();
  });

  test('applyScheduleTableCaptureStyles allows up to 4 holiday label lines in export', () => {
    const root = document.createElement('div');
    const holidayCell = document.createElement('div');
    holidayCell.className = 'bb-schedule-holiday-cell';
    const label = document.createElement('span');
    label.className = 'bb-schedule-holiday-label';
    holidayCell.appendChild(label);
    root.appendChild(holidayCell);

    const restore = applyScheduleTableCaptureStyles(root);
    expect(holidayCell.style.minHeight).toBe('88px');
    expect(holidayCell.style.overflow).toBe('hidden');
    expect(label.style.getPropertyValue('-webkit-line-clamp')).toBe('4');
    expect(label.style.whiteSpace).toBe('normal');
    expect(label.style.textTransform).toBe('none');

    restore();
  });

  test('applyScheduleTableCaptureStyles inlines name-cell grid lines for sticky column', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const grid = document.createElement('div');
    grid.className = 'bb-schedule-grid';
    const nameCell = document.createElement('div');
    nameCell.className = 'bb-schedule-name-cell';
    nameCell.style.boxShadow = '0 1px 3px rgb(0 0 0 / 0.12)';
    grid.appendChild(nameCell);
    root.appendChild(grid);

    const restore = applyScheduleTableCaptureStyles(root);
    expect(nameCell.style.borderBottom).toContain('0.1');
    expect(nameCell.style.boxShadow).toContain('inset');
    expect(nameCell.style.borderRight).toContain('0.1');

    restore();
    document.body.removeChild(root);
    expect(nameCell.style.boxShadow).toBe('0 1px 3px rgb(0 0 0 / 0.12)');
  });

  test('captureScheduleTableAsPng toggles capturing class only during export', async () => {
    const element = document.createElement('div');
    element.className = 'bb-schedule-export-surface';
    Object.defineProperty(element, 'scrollWidth', { value: 900 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    let classDuringCapture = false;
    toBlobMock.mockImplementation(async (el) => {
      classDuringCapture = (el as HTMLElement).classList.contains('bb-schedule-export-capturing');
      return new Blob(['png'], { type: 'image/png' });
    });

    await captureScheduleTableAsPng(element);

    expect(classDuringCapture).toBe(true);
    expect(element.classList.contains('bb-schedule-export-capturing')).toBe(false);
  });

  test('captureScheduleTableAsPng strips dark class and uses cream background', async () => {
    document.documentElement.classList.add('dark');
    const element = document.createElement('div');
    element.className = 'bb-schedule-export-surface';
    Object.defineProperty(element, 'scrollWidth', { value: 900 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    const blob = await captureScheduleTableAsPng(element);

    expect(blob.type).toBe('image/png');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(getFontEmbedCSSMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ preferredFontFormat: 'woff2' }),
    );
    expect(toBlobMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        backgroundColor: SCHEDULE_EXPORT_BG,
        skipFonts: false,
        preferredFontFormat: 'woff2',
        fontEmbedCSS: '@font-face { font-family: Prompt; }',
      }),
    );
  });
});
