import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const SECRETARY_SUBWINDOW_FILES = [
  'SecretaryTaskSubwindow.tsx',
  'SecretaryManualTaskDialog.tsx',
  'BeanOrdersOverlay.tsx',
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
    expect(scaffold).toContain('verticalAlign: \'center\'');
  });

  test('SecretaryTaskSubwindow uses shared mobile-safe scaffold props', () => {
    const code = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskSubwindow.tsx'),
      'utf-8',
    );
    expect(code).toContain('SECRETARY_MODAL_SCAFFOLD_PROPS');
    expect(code).toContain('SECRETARY_MODAL_LAYOUT_CLASS');
    expect(code).not.toContain('items-end');
  });

  test.each(SECRETARY_SUBWINDOW_FILES)('%s keeps internal scroll regions', (file) => {
    const code = fs.readFileSync(
      path.resolve(ROOT, `app/[locale]/secretary/_components/${file}`),
      'utf-8',
    );
    expect(code).toMatch(/overflow-y-auto bb-smooth-scroll|FadeModalScaffold/);
  });

  test('purchase orders modal from secretary uses scrollable centered shell', () => {
    const modal = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/_components/PurchaseOrdersModal.tsx'),
      'utf-8',
    );
    expect(modal).toContain('overflow-y-auto overscroll-contain bb-smooth-scroll');
    expect(modal).toContain('flex min-h-full min-w-0 items-center justify-center');
    expect(modal).toContain('getModalBackdropKeyboardAwareStyle');
    expect(modal).toContain('verticalAlign: \'center\'');
  });

  test('branch withdraw overlay delegates to shared sub-window shell', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/BranchWithdrawOverlay.tsx'),
      'utf-8',
    );
    expect(overlay).toContain('SecretaryTaskSubwindow');
  });
});
