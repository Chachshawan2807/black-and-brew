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
  applyPurchaseOrderCaptureStyles,
  capturePurchaseOrderAsPng,
  PO_EXPORT_BG,
  resetPurchaseOrderExportCaptureCache,
} from '@/lib/purchase-order-export-capture';

describe('purchase-order-export-capture', () => {
  beforeEach(() => {
    resetPurchaseOrderExportCaptureCache();
    toBlobMock.mockReset();
    getFontEmbedCSSMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    getFontEmbedCSSMock.mockResolvedValue('@font-face { font-family: Prompt; }');
    document.documentElement.classList.remove('dark');
  });

  test('applyPurchaseOrderCaptureStyles inlines font-family then restores', () => {
    const root = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = 'รายการสั่งซื้อ';
    root.appendChild(label);

    const restore = applyPurchaseOrderCaptureStyles(root);
    expect(root.style.fontFamily).toContain('Inter');
    expect(label.style.fontFamily).toContain('Inter');

    restore();
    expect(root.style.fontFamily).toBe('');
    expect(label.style.fontFamily).toBe('');
  });

  test('capturePurchaseOrderAsPng embeds fonts and preserves overflow clipping', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 800 });
    Object.defineProperty(element, 'scrollHeight', { value: 600 });

    await capturePurchaseOrderAsPng(element);

    expect(getFontEmbedCSSMock).toHaveBeenCalled();
    expect(toBlobMock).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        backgroundColor: PO_EXPORT_BG,
        skipFonts: false,
        fontEmbedCSS: '@font-face { font-family: Prompt; }',
        preferredFontFormat: 'woff2',
      }),
    );

    const options = toBlobMock.mock.calls[0]?.[1] as { style: Record<string, string> };
    expect(options.style).not.toHaveProperty('overflow');
  });
});
