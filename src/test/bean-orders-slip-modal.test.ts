import { describe, expect, test } from 'vitest';
import {
  SLIP_IMAGE_CLASS_LARGE,
  SLIP_MODAL_BODY_CLASS_LARGE,
  SLIP_MODAL_LAYOUT_CLASS_LARGE,
  SLIP_MODAL_PANEL_CLASS,
  SLIP_MODAL_PANEL_CLASS_LARGE,
} from '@/app/[locale]/bean-orders/_components/PaymentSlipViewer';

describe('bean order slip modal layout', () => {
  test('keeps compact modal for form and other pages', () => {
    expect(SLIP_MODAL_PANEL_CLASS).toContain('max-w-[min(92vw,360px)]');
    expect(SLIP_MODAL_PANEL_CLASS_LARGE).not.toBe(SLIP_MODAL_PANEL_CLASS);
  });

  test('detail page large modal fits slip in viewport without scrolling', () => {
    expect(SLIP_MODAL_PANEL_CLASS_LARGE).toContain('max-h-[calc(100dvh-2rem)]');
    expect(SLIP_MODAL_BODY_CLASS_LARGE).toContain('overflow-hidden');
    expect(SLIP_MODAL_LAYOUT_CLASS_LARGE).toContain('items-center');
    expect(SLIP_IMAGE_CLASS_LARGE).toContain('max-h-[calc(100dvh-4rem)]');
    expect(SLIP_IMAGE_CLASS_LARGE).toContain('max-w-[min(calc(100vw-2rem),520px)]');
    expect(SLIP_IMAGE_CLASS_LARGE).toContain('object-contain');
  });
});
