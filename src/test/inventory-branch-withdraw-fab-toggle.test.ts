import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS } from '@/app/[locale]/inventory/branch-withdraw/branch-withdraw-layout';
import { buildBranchWithdrawScrollBodyKeyboardStyle } from '@/lib/branch-withdraw-mobile-shell';

const ROOT = path.resolve(__dirname, '..');

describe('branch withdraw FAB overlay (no layout shift)', () => {
  test('mobile shell uses flex column inside main landmark (no fixed containment trap)', () => {
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:flex');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:flex-1');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).not.toContain('max-md:fixed');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).not.toContain('max-md:z-0');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).not.toContain('11rem');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).not.toContain('4rem');
  });

  test('scroll body style adds keyboard padding without fixed shell offsets', () => {
    const baseInsets = {
      bottomInset: 0,
      offsetTop: 0,
      offsetLeft: 0,
      visibleHeight: 800,
      visibleWidth: 400,
      isKeyboardOpen: false,
    };

    expect(
      buildBranchWithdrawScrollBodyKeyboardStyle({
        embedded: false,
        isMaxMd: true,
        viewportInsets: baseInsets,
      }),
    ).toBeUndefined();

    const keyboardStyle = buildBranchWithdrawScrollBodyKeyboardStyle({
      embedded: false,
      isMaxMd: true,
      viewportInsets: {
        ...baseInsets,
        bottomInset: 280,
        isKeyboardOpen: true,
      },
    });

    expect(keyboardStyle?.paddingBottom).toBe(280);
    expect(keyboardStyle).not.toHaveProperty('top');
  });

  test('client does not react to fab stack visibility for layout', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );

    expect(client).toContain('buildBranchWithdrawScrollBodyKeyboardStyle');
    expect(client).toContain('scrollBodyKeyboardStyle');
    expect(client).not.toContain('useFloatingOverlay');
    expect(client).not.toContain('fabStackHidden');
    expect(client).not.toContain('FAB_COLLAPSED');
  });

  test('SidebarLayout does not shift padding when FAB stack toggles', () => {
    const layout = fs.readFileSync(
      path.resolve(ROOT, 'components/sidebar/SidebarLayout.tsx'),
      'utf-8',
    );

    expect(layout).not.toContain('useFloatingOverlay');
    expect(layout).not.toContain('FAB_PAGE_BOTTOM_PADDING');
    expect(layout).not.toContain('fabStackHidden');
  });

  test('floating-action-layout documents overlay-only FAB stack', () => {
    const layout = fs.readFileSync(path.resolve(ROOT, 'lib/floating-action-layout.ts'), 'utf-8');

    expect(layout).toContain('overlay page content');
    expect(layout).not.toContain('FAB_PAGE_BOTTOM_PADDING_CLASS');
  });
});
