import { beforeEach, describe, expect, test, vi } from 'vitest';

const toPngMock = vi.fn();

vi.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => toPngMock(...args),
}));

import {
  applyScheduleTableCaptureStyles,
  captureScheduleTableAsPng,
  SCHEDULE_EXPORT_BG,
  SCHEDULE_EXPORT_TEXT,
  withLightDocumentTheme,
} from '@/lib/schedule-export-capture';

describe('schedule-export-capture', () => {
  beforeEach(() => {
    toPngMock.mockReset();
    toPngMock.mockResolvedValue('data:image/png;base64,abc');
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

  test('applyScheduleTableCaptureStyles inlines light tokens for theme classes then restores', () => {
    const root = document.createElement('div');
    root.id = 'blackandbrew-schedule-table';

    const nameCell = document.createElement('div');
    nameCell.className = 'text-foreground bg-card border-b border-border';
    root.appendChild(nameCell);

    const dayLabel = document.createElement('span');
    dayLabel.className = 'text-foreground';
    root.appendChild(dayLabel);

    const shiftCell = document.createElement('div');
    shiftCell.className = 'bb-pastel-surface rounded-lg';
    root.appendChild(shiftCell);

    const restore = applyScheduleTableCaptureStyles(root);
    expect(nameCell.style.color).toBe('rgb(0, 0, 0)');
    expect(nameCell.style.backgroundColor).toBe('rgb(253, 252, 240)');
    expect(nameCell.style.borderBottomColor).toBe('rgba(0, 0, 0, 0.05)');
    expect(dayLabel.style.color).toBe('rgb(0, 0, 0)');
    expect(shiftCell.style.backgroundColor).toBe('');
    expect(root.style.backgroundColor).toBe('rgb(253, 252, 240)');

    restore();
    expect(nameCell.style.color).toBe('');
    expect(nameCell.style.backgroundColor).toBe('');
  });

  test('captureScheduleTableAsPng strips dark class and uses cream background', async () => {
    document.documentElement.classList.add('dark');
    const element = document.createElement('div');
    element.className = 'bb-schedule-export-surface';
    Object.defineProperty(element, 'scrollWidth', { value: 900 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    await captureScheduleTableAsPng(element);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(toPngMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ backgroundColor: SCHEDULE_EXPORT_BG, skipFonts: true }),
    );
  });
});
