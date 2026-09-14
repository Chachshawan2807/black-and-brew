import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  SLIP_IMAGE_CLASS_LARGE,
  SLIP_MODAL_BODY_CLASS_LARGE,
  SLIP_MODAL_LAYOUT_CLASS_LARGE,
  SLIP_MODAL_PANEL_CLASS,
  SLIP_MODAL_PANEL_CLASS_LARGE,
} from '@/app/[locale]/bean-orders/_components/PaymentSlipViewer';

const paymentSlipViewerSource = readFileSync(
  resolve(__dirname, '../app/[locale]/bean-orders/_components/PaymentSlipViewer.tsx'),
  'utf8',
);

const beanOrderUiPrimitivesSource = readFileSync(
  resolve(__dirname, '../app/[locale]/bean-orders/_components/bean-order-ui-primitives.tsx'),
  'utf8',
);

const fadeModalScaffoldSource = readFileSync(
  resolve(__dirname, '../components/ui/fade-modal-scaffold.tsx'),
  'utf8',
);

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

  test('large slip modal uses scrollable centered shell for viewport alignment', () => {
    expect(paymentSlipViewerSource).toMatch(/centerScrollable(?:=\{true\})?(?![^\n]*!largeModal)/);
    expect(paymentSlipViewerSource).not.toContain('centerScrollable={!largeModal}');
  });

  test('bean order dialog portals above FAB stack for true viewport centering', () => {
    expect(beanOrderUiPrimitivesSource).toContain('ModalPortal');
    expect(beanOrderUiPrimitivesSource).toContain('APP_MODAL_ABOVE_FAB_Z_INDEX');
  });

  test('scrollable slip modal closes when tapping the empty scrim area', () => {
    expect(paymentSlipViewerSource).toContain('onClose={handleClose}');
    expect(fadeModalScaffoldSource).toContain('handleScrollableScrimClick');
    expect(fadeModalScaffoldSource).toMatch(/event\.target !== event\.currentTarget/);
    expect(fadeModalScaffoldSource).toContain('stopPropagation');
  });
});
