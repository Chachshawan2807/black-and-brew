import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const SECRETARY_SHELL_CONSUMERS = [
  'SecretaryTaskSubwindow.tsx',
  'SecretaryManualTaskDialog.tsx',
  'SecretaryTaskListOverlay.tsx',
  'SecretaryTaskInfoOverlay.tsx',
];

describe('secretary mobile task overlays', () => {
  test('shared layout enables centered scrollable shell with keyboard awareness', () => {
    const layout = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/secretary-modal-layout.ts'),
      'utf-8',
    );
    expect(layout).toContain('items-center justify-center');
    expect(layout).toContain('centerScrollable: true');
    expect(layout).toContain('keyboardAware: true');
    expect(layout).toContain('SECRETARY_MODAL_OVERLAY_CLASS');
    expect(layout).toContain('SECRETARY_PANEL_MAX_HEIGHT');
  });

  test('FadeModalScaffold supports scrollable centered mobile layout', () => {
    const scaffold = fs.readFileSync(
      path.resolve(ROOT, 'components/ui/fade-modal-scaffold.tsx'),
      'utf-8',
    );
    expect(scaffold).toContain('centerScrollable');
    expect(scaffold).toContain('keyboardAware');
    expect(scaffold).toContain('overflow-y-auto overscroll-contain bb-smooth-scroll');
    expect(scaffold).toContain('flex min-h-full');
    expect(scaffold).toContain("verticalAlign: 'center'");
  });

  test('SecretaryTaskPanelShell owns mobile-safe scaffold props and scroll body', () => {
    const code = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskPanelShell.tsx'),
      'utf-8',
    );
    expect(code).toContain('SECRETARY_MODAL_SCAFFOLD_PROPS');
    expect(code).toContain('SECRETARY_MODAL_LAYOUT_CLASS');
    expect(code).toContain('SECRETARY_MODAL_OVERLAY_CLASS');
    expect(code).toContain('overflow-y-auto overscroll-contain bb-smooth-scroll');
    expect(code).not.toContain('items-end');
  });

  test.each(SECRETARY_SHELL_CONSUMERS)('%s delegates chrome to SecretaryTaskPanelShell', (file) => {
    const code = fs.readFileSync(
      path.resolve(ROOT, `app/[locale]/secretary/_components/${file}`),
      'utf-8',
    );
    expect(code).toContain('SecretaryTaskPanelShell');
    expect(code).not.toContain('items-end');
  });

  test('purchase orders modal from inventory uses scrollable centered shell', () => {
    const modal = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/_components/PurchaseOrdersModal.tsx'),
      'utf-8',
    );
    expect(modal).toContain('overflow-y-auto overscroll-contain bb-smooth-scroll');
    expect(modal).toContain('flex min-h-full min-w-0 items-center justify-center');
    expect(modal).toContain('getModalBackdropKeyboardAwareStyle');
    expect(modal).toContain("verticalAlign: 'center'");
  });

  test('purchase orders modal compacts filter chips and icon buttons on mobile', () => {
    const modal = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/_components/PurchaseOrdersModal.tsx'),
      'utf-8',
    );
    expect(modal).toContain('PO_FILTER_CHIP');
    expect(modal).toContain('flex-nowrap sm:flex-wrap');
    expect(modal).toContain('max-sm:h-9 max-sm:w-9');
    expect(modal).toContain('px-2.5 py-1.5 sm:px-4 sm:py-2');
  });

});
