import { beforeEach, describe, expect, test, vi } from 'vitest';

const toPngMock = vi.fn();

vi.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => toPngMock(...args),
}));

import { captureElementAsPng } from '@/lib/capture-element-png';

describe('captureElementAsPng', () => {
  beforeEach(() => {
    toPngMock.mockReset();
    toPngMock.mockResolvedValue('data:image/png;base64,abc');
  });

  test('captures full scroll dimensions and flattens sticky nodes during export', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 1200 });
    Object.defineProperty(element, 'scrollHeight', { value: 2400 });

    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'sticky top-0';
    stickyHeader.style.position = 'sticky';
    element.appendChild(stickyHeader);

    await captureElementAsPng(element, { backgroundColor: '#fdfcf0' });

    expect(stickyHeader.style.position).toBe('sticky');
    expect(toPngMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        width: 1200,
        height: 2400,
        backgroundColor: '#fdfcf0',
        skipFonts: true,
        style: expect.objectContaining({ maxHeight: 'none', overflow: 'visible' }),
      }),
    );
  });

  test('flattens descendant box-shadow during capture and restores after', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 200 });

    const shiftCell = document.createElement('div');
    shiftCell.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
    element.appendChild(shiftCell);

    let shadowDuringCapture: string | undefined;
    toPngMock.mockImplementation(async (el) => {
      shadowDuringCapture = (el as HTMLElement).querySelector('div')?.style.boxShadow;
      return 'data:image/png;base64,abc';
    });

    await captureElementAsPng(element);

    expect(shadowDuringCapture).toBe('none');
    expect(shiftCell.style.boxShadow).toBe('0 1px 2px 0 rgb(0 0 0 / 0.05)');
  });

  test('reduces pixelRatio when canvas would exceed Safari limits', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 5000 });
    Object.defineProperty(element, 'scrollHeight', { value: 5000 });

    await captureElementAsPng(element, { pixelRatio: 2 });

    const options = toPngMock.mock.calls[0]?.[1] as { pixelRatio: number };
    expect(options.pixelRatio).toBeLessThan(2);
  });
});
