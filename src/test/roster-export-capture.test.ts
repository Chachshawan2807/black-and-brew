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

import { captureRosterAsPng, measureRosterExportContentHeight, applyRosterCaptureStyles } from '@/lib/roster-export-capture';

describe('roster-export-capture', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    getFontEmbedCSSMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    getFontEmbedCSSMock.mockResolvedValue('@font-face { font-family: Prompt; }');
    document.documentElement.classList.remove('dark');
  });

  test('captureRosterAsPng embeds fonts and preserves overflow for wide roster tables', async () => {
    const element = document.createElement('div');
    element.style.backgroundColor = 'rgb(253, 252, 240)';
    Object.defineProperty(element, 'scrollWidth', { value: 1800 });
    Object.defineProperty(element, 'scrollHeight', { value: 900 });

    const blob = await captureRosterAsPng(element);

    expect(blob.type).toBe('image/png');
    expect(getFontEmbedCSSMock).toHaveBeenCalled();
    expect(toBlobMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        width: 1800,
        height: 900,
        backgroundColor: '#faf9f2',
        skipFonts: false,
        fontEmbedCSS: '@font-face { font-family: Prompt; }',
        preferredFontFormat: 'woff2',
      }),
    );
  });

  test('captureRosterAsPng temporarily removes dark theme during capture', async () => {
    document.documentElement.classList.add('dark');
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 300 });

    await captureRosterAsPng(element);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('measureRosterExportContentHeight crops to calendar grid bottom edge', () => {
    const root = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';
    root.appendChild(grid);

    root.getBoundingClientRect = () =>
      ({ top: 80, bottom: 900, left: 0, right: 400, width: 400, height: 820, x: 0, y: 80, toJSON: () => {} }) as DOMRect;
    grid.getBoundingClientRect = () =>
      ({ top: 180, bottom: 520, left: 0, right: 400, width: 400, height: 340, x: 0, y: 180, toJSON: () => {} }) as DOMRect;

    expect(measureRosterExportContentHeight(root)).toBe(440);
  });

  test('captureRosterAsPng passes measured content height to capture helper', async () => {
    const root = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';
    root.appendChild(grid);
    Object.defineProperty(root, 'scrollWidth', { value: 640 });
    Object.defineProperty(root, 'scrollHeight', { value: 1200 });
    root.getBoundingClientRect = () =>
      ({ top: 0, bottom: 1200, left: 0, right: 640, width: 640, height: 1200, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    grid.getBoundingClientRect = () =>
      ({ top: 120, bottom: 560, left: 0, right: 640, width: 640, height: 440, x: 0, y: 120, toJSON: () => {} }) as DOMRect;

    await captureRosterAsPng(root);

    expect(toBlobMock).toHaveBeenCalledWith(
      root,
      expect.objectContaining({ height: 592 }),
    );
  });

  test('captureRosterAsPng applies export classes only during capture', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 300 });

    const addSpy = vi.spyOn(element.classList, 'add');

    await captureRosterAsPng(element);

    expect(addSpy).toHaveBeenCalledWith('bb-roster-export-capturing', 'bb-roster-export-surface');
    expect(element.classList.contains('bb-roster-export-capturing')).toBe(false);
    expect(element.classList.contains('bb-roster-export-surface')).toBe(false);
  });

  test('captureRosterAsPng forwards filter callback', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 300 });

    const filter = vi.fn(() => true);
    await captureRosterAsPng(element, { filter });

    expect(toBlobMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ filter }),
    );
  });

  test('applyRosterCaptureStyles forces desktop grid width and full Thai day names', () => {
    const root = document.createElement('div');
    root.id = 'blackandbrew-roster-export';

    const staffHeader = document.createElement('div');
    root.appendChild(staffHeader);

    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';

    const header = document.createElement('div');
    const shortDay = document.createElement('span');
    shortDay.className = 'md:hidden';
    shortDay.textContent = 'อา.';
    const fullDay = document.createElement('span');
    fullDay.className = 'hidden md:inline';
    fullDay.textContent = 'อาทิตย์';
    header.append(shortDay, fullDay);
    grid.appendChild(header);

    for (let i = 1; i < 7; i++) {
      grid.appendChild(document.createElement('div'));
    }

    const dayCell = document.createElement('div');
    const dateLabel = document.createElement('span');
    dateLabel.textContent = '1';
    const shiftPill = document.createElement('div');
    shiftPill.textContent = '6:30';
    dayCell.append(dateLabel, shiftPill);
    grid.appendChild(dayCell);

    root.appendChild(grid);

    const restore = applyRosterCaptureStyles(root);

    expect(root.style.width).toBe('840px');
    expect(grid.style.gridTemplateColumns).toBe('repeat(7, 104px)');
    expect(grid.style.gap).toBe('8px');
    expect(staffHeader.style.flexDirection).toBe('row');
    expect(dayCell.style.height).toBe('144px');
    expect(shortDay.style.display).toBe('none');
    expect(fullDay.style.display).toBe('inline');
    expect(shiftPill.style.minHeight).toBe('50px');

    restore();
    expect(root.style.width).toBe('');
    expect(grid.style.gridTemplateColumns).toBe('');
    expect(shortDay.style.display).toBe('');
    expect(fullDay.style.display).toBe('');
  });
});
