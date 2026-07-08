import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/fonts', () => ({
  APP_FONT_FAMILY_CSS: 'Inter, sans-serif',
  appFontClassName: 'font-inter',
}));

const toBlobMock = vi.fn();

vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => toBlobMock(...args),
}));

import {
  applyScheduleTableCaptureStyles,
  captureScheduleTableAsPng,
  SCHEDULE_EXPORT_BG,
  withLightDocumentTheme,
} from '@/lib/schedule-export-capture';

describe('schedule-export-capture', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
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

    const restore = applyScheduleTableCaptureStyles(root);
    expect(root.style.fontFamily).toContain('Inter');
    expect(grid.style.gridTemplateColumns).toContain('minmax(');
    expect(nowrap.style.whiteSpace).toBe('nowrap');

    restore();
    expect(root.style.fontFamily).toBe('');
    expect(grid.style.gridTemplateColumns).toBe('');
    expect(nowrap.style.whiteSpace).toBe('');
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
    expect(toBlobMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ backgroundColor: SCHEDULE_EXPORT_BG, skipFonts: true }),
    );
  });
});
