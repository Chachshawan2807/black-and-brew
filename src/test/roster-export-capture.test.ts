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
  applyRosterCaptureStyles,
  captureRosterAsPng,
  computeRosterExportGridHeight,
  measureRosterExportContentHeight,
} from '@/lib/roster-export-capture';

describe('roster-export-capture', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    getFontEmbedCSSMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    getFontEmbedCSSMock.mockResolvedValue('@font-face { font-family: Prompt; }');
    document.documentElement.classList.remove('dark');
  });

  test('captureRosterAsPng captures a viewport clone instead of mutating the live roster node', async () => {
    const parent = document.createElement('div');
    parent.className = 'overflow-hidden';
    parent.style.overflow = 'hidden';
    parent.style.width = '400px';
    document.body.appendChild(parent);

    const element = document.createElement('div');
    element.id = 'blackandbrew-roster-export';
    parent.appendChild(element);

    let capturedNode: HTMLElement | null = null;
    toBlobMock.mockImplementation(async (node: HTMLElement) => {
      capturedNode = node;
      return new Blob(['png'], { type: 'image/png' });
    });

    await captureRosterAsPng(element);

    expect(capturedNode).not.toBeNull();
    expect(capturedNode).not.toBe(element);
    expect(capturedNode?.id).toBe('');
    expect(element.parentElement).toBe(parent);
    expect(document.querySelector('[data-roster-export-host]')).toBeNull();

    parent.remove();
  });

  test('captureRosterAsPng uses fixed export width so all seven day columns are captured', async () => {
    const element = document.createElement('div');
    element.style.backgroundColor = 'rgb(253, 252, 240)';
    Object.defineProperty(element, 'scrollWidth', { value: 512 });
    Object.defineProperty(element, 'scrollHeight', { value: 900 });

    const blob = await captureRosterAsPng(element);

    expect(blob.type).toBe('image/png');
    expect(getFontEmbedCSSMock).toHaveBeenCalled();
    expect(toBlobMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        width: 840,
        backgroundColor: '#faf9f2',
        skipFonts: false,
        fontEmbedCSS: '@font-face { font-family: Prompt; }',
        preferredFontFormat: 'woff2',
        style: expect.objectContaining({
          width: '840px',
          padding: '32px',
          boxSizing: 'border-box',
        }),
      }),
    );
    const captureStyle = toBlobMock.mock.calls[0]?.[1]?.style as Record<string, string>;
    expect(captureStyle.padding).not.toBe('0');
  });

  test('captureRosterAsPng temporarily removes dark theme during capture', async () => {
    document.documentElement.classList.add('dark');
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 300 });

    await captureRosterAsPng(element);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('measureRosterExportContentHeight crops to calendar grid bottom edge when layout is valid', () => {
    const root = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';
    root.appendChild(grid);

    root.getBoundingClientRect = () =>
      ({ top: 80, bottom: 900, left: 0, right: 776, width: 776, height: 820, x: 0, y: 80, toJSON: () => {} }) as DOMRect;
    grid.getBoundingClientRect = () =>
      ({ top: 180, bottom: 520, left: 0, right: 776, width: 776, height: 340, x: 0, y: 180, toJSON: () => {} }) as DOMRect;

    expect(measureRosterExportContentHeight(root)).toBe(440);
  });

  test('measureRosterExportContentHeight uses deterministic height when mobile layout is skinny', () => {
    const root = document.createElement('div');
    root.style.paddingTop = '32px';
    root.style.paddingBottom = '32px';

    const staffHeader = document.createElement('div');
    root.appendChild(staffHeader);

    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';
    for (let i = 0; i < 14; i++) grid.appendChild(document.createElement('div'));
    root.appendChild(grid);

    grid.getBoundingClientRect = () =>
      ({ top: 0, bottom: 0, left: 0, right: 320, width: 320, height: 400, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

    expect(measureRosterExportContentHeight(root)).toBe(368);
  });

  test('computeRosterExportGridHeight matches desktop row geometry', () => {
    const grid = document.createElement('div');
    for (let i = 0; i < 7 + 14; i++) grid.appendChild(document.createElement('div'));

    expect(computeRosterExportGridHeight(grid)).toBe(336);
  });

  test('captureRosterAsPng passes measured content height to capture helper', async () => {
    const root = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';
    root.appendChild(grid);
    Object.defineProperty(root, 'scrollWidth', { value: 640 });
    Object.defineProperty(root, 'scrollHeight', { value: 1200 });
    root.getBoundingClientRect = () =>
      ({ top: 0, bottom: 1200, left: 0, right: 776, width: 776, height: 1200, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    grid.getBoundingClientRect = () =>
      ({ top: 120, bottom: 560, left: 0, right: 776, width: 776, height: 440, x: 0, y: 120, toJSON: () => {} }) as DOMRect;

    await captureRosterAsPng(root);

    expect(toBlobMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ height: 96 }),
    );
  });

  test('captureRosterAsPng does not leave export classes on the live roster node', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 300 });

    await captureRosterAsPng(element);

    expect(element.classList.contains('bb-roster-export-capturing')).toBe(false);
    expect(element.classList.contains('bb-roster-export-surface')).toBe(false);
  });

  test('captureRosterAsPng forwards filter callback to the export clone', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 300 });

    const filter = vi.fn(() => true);
    await captureRosterAsPng(element, { filter });

    expect(toBlobMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ filter }),
    );
  });

  test('applyRosterCaptureStyles forces desktop grid width and full Thai day names', () => {
    const root = document.createElement('div');

    const staffHeader = document.createElement('div');
    root.appendChild(staffHeader);

    const grid = document.createElement('div');
    grid.className = 'bb-roster-export-grid';

    const header = document.createElement('div');
    const shortDay = document.createElement('span');
    shortDay.className = 'md:hidden';
    shortDay.textContent = 'จ.';
    const fullDay = document.createElement('span');
    fullDay.className = 'hidden md:inline';
    fullDay.textContent = 'จันทร์';
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
    expect(grid.style.minWidth).toBe('776px');
    expect(staffHeader.style.flexDirection).toBe('row');
    expect(dayCell.style.height).toBe('144px');
    expect(header.textContent).toBe('จันทร์');
    expect(shiftPill.style.minHeight).toBe('50px');

    restore();
    expect(root.style.width).toBe('');
    expect(grid.style.gridTemplateColumns).toBe('');
    expect(header.textContent).toBe('จ.จันทร์');
  });
});
