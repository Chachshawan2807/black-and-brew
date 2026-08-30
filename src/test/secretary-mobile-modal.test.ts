import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const SECRETARY_OVERLAY_FILES = [
  'SecretaryListDialog.tsx',
  'SecretaryManualTaskDialog.tsx',
  'ScheduleReviewDialog.tsx',
  'BranchWithdrawOverlay.tsx',
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

  test.each(SECRETARY_OVERLAY_FILES)('%s uses shared mobile-safe scaffold props', (file) => {
    const code = fs.readFileSync(
      path.resolve(ROOT, `app/[locale]/secretary/_components/${file}`),
      'utf-8',
    );
    expect(code).toContain('SECRETARY_MODAL_SCAFFOLD_PROPS');
    expect(code).toContain('SECRETARY_MODAL_LAYOUT_CLASS');
    expect(code).not.toContain('items-end');
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

  test('list and review dialogs keep internal scroll regions', () => {
    const listDialog = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryListDialog.tsx'),
      'utf-8',
    );
    expect(listDialog).toMatch(/min-h-0 flex-1 overflow-y-auto bb-smooth-scroll/);

    const reviewDialog = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/ScheduleReviewDialog.tsx'),
      'utf-8',
    );
    expect(reviewDialog).toMatch(/min-h-0 flex-1 overflow-y-auto[\s\S]*bb-smooth-scroll/);
  });
});
