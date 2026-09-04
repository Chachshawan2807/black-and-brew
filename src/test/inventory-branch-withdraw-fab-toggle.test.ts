import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS } from '@/app/[locale]/inventory/branch-withdraw/branch-withdraw-layout';
import { buildBranchWithdrawStandaloneMobileShellStyle } from '@/lib/branch-withdraw-mobile-shell';

const ROOT = path.resolve(__dirname, '..');

describe('branch withdraw FAB overlay (no layout shift)', () => {
  test('mobile shell fills viewport below header without FAB clearance', () => {
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:fixed');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:top-[72px]');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:bottom-0');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).not.toContain('11rem');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).not.toContain('4rem');
  });

  test('mobile shell style ignores FAB toggle and only adjusts for keyboard', () => {
    const baseInsets = {
      bottomInset: 0,
      offsetTop: 0,
      offsetLeft: 0,
      visibleHeight: 800,
      visibleWidth: 400,
      isKeyboardOpen: false,
    };

    expect(
      buildBranchWithdrawStandaloneMobileShellStyle({
        embedded: false,
        isMaxMd: true,
        viewportInsets: baseInsets,
      }),
    ).toBeUndefined();

    const keyboardStyle = buildBranchWithdrawStandaloneMobileShellStyle({
      embedded: false,
      isMaxMd: true,
      viewportInsets: {
        ...baseInsets,
        bottomInset: 280,
        isKeyboardOpen: true,
      },
    });

    expect(keyboardStyle?.top).toBe(72);
    expect(keyboardStyle?.bottom).toBe(280);
  });

  test('client does not react to fab stack visibility for layout', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );

    expect(client).toContain('buildBranchWithdrawStandaloneMobileShellStyle');
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
