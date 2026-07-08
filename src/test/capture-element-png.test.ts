import { beforeEach, describe, expect, test, vi } from 'vitest';

const toBlobMock = vi.fn();

vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => toBlobMock(...args),
}));

import { captureElementAsPng, preloadCaptureLibraries } from '@/lib/capture-element-png';

describe('captureElementAsPng', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  test('captures full scroll dimensions and flattens sticky nodes during export', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 1200 });
    Object.defineProperty(element, 'scrollHeight', { value: 2400 });

    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'sticky top-0';
    stickyHeader.style.position = 'sticky';
    element.appendChild(stickyHeader);

    const blob = await captureElementAsPng(element, { backgroundColor: '#fdfcf0' });

    expect(blob.type).toBe('image/png');
    expect(stickyHeader.style.position).toBe('sticky');
    expect(toBlobMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        width: 1200,
        height: 2400,
        backgroundColor: '#fdfcf0',
        cacheBust: false,
        skipFonts: true,
        style: expect.objectContaining({ maxHeight: 'none', overflow: 'visible' }),
      }),
    );
  });

  test('can preserve root overflow for rounded export wrappers', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 800 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    await captureElementAsPng(element, { preserveOverflow: true });

    const options = toBlobMock.mock.calls[0]?.[1] as { style: Record<string, string> };
    expect(options.style).not.toHaveProperty('overflow');
  });

  test('flattens descendant box-shadow during capture and restores after', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 400 });
    Object.defineProperty(element, 'scrollHeight', { value: 200 });

    const shiftCell = document.createElement('div');
    shiftCell.className = 'shadow-sm';
    shiftCell.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
    element.appendChild(shiftCell);

    let shadowDuringCapture: string | undefined;
    toBlobMock.mockImplementation(async (el) => {
      shadowDuringCapture = (el as HTMLElement).querySelector('div')?.style.boxShadow;
      return new Blob(['png'], { type: 'image/png' });
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

    const options = toBlobMock.mock.calls[0]?.[1] as { pixelRatio: number };
    expect(options.pixelRatio).toBeLessThan(2);
  });

  test('preloadCaptureLibraries starts loading html-to-image without awaiting', async () => {
    preloadCaptureLibraries();
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 100 });
    Object.defineProperty(element, 'scrollHeight', { value: 100 });

    await captureElementAsPng(element);

    expect(toBlobMock).toHaveBeenCalled();
  });
});
