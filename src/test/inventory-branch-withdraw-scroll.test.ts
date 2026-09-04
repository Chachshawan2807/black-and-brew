import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BRANCH_WITHDRAW_ACTION_BAR_CLASS,
  BRANCH_WITHDRAW_PAGE_SHELL_CLASS,
  BRANCH_WITHDRAW_SCROLL_BODY_CLASS,
  BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS,
  BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS,
} from '@/app/[locale]/inventory/branch-withdraw/branch-withdraw-layout';

const ROOT = path.resolve(__dirname, '..');

describe('branch withdraw scroll layout', () => {
  test('scroll body uses flex-1 min-h-0 overflow with overscroll containment', () => {
    expect(BRANCH_WITHDRAW_SCROLL_BODY_CLASS).toContain('flex-1');
    expect(BRANCH_WITHDRAW_SCROLL_BODY_CLASS).toContain('min-h-0');
    expect(BRANCH_WITHDRAW_SCROLL_BODY_CLASS).toContain('overflow-y-auto');
    expect(BRANCH_WITHDRAW_SCROLL_BODY_CLASS).toContain('overscroll-contain');
    expect(BRANCH_WITHDRAW_SCROLL_BODY_CLASS).toContain('bb-smooth-scroll');
  });

  test('mobile standalone shell is fixed within main landmark (top-0, not double header offset)', () => {
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:fixed');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:top-0');
    expect(BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS).toContain('max-md:bottom-0');
  });

  test('desktop page shell bounds height for inner scroll', () => {
    expect(BRANCH_WITHDRAW_PAGE_SHELL_CLASS).toContain('md:h-[calc(100svh-2rem)]');
    expect(BRANCH_WITHDRAW_PAGE_SHELL_CLASS).toContain('md:overflow-hidden');
    expect(BRANCH_WITHDRAW_PAGE_SHELL_CLASS).toContain('max-md:contents');
  });

  test('desktop client shell fills bounded page shell', () => {
    expect(BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS).toContain('md:h-full');
    expect(BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS).toContain('md:min-h-0');
  });

  test('action bar sits above withdrawal history inside scroll region', () => {
    expect(BRANCH_WITHDRAW_ACTION_BAR_CLASS).toContain('rounded-2xl');
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );
    expect(client).toMatch(/\{actionBar\}[\s\S]*ประวัติการเบิก/);
    expect(client).not.toMatch(
      /<div className=\{BRANCH_WITHDRAW_SCROLL_BODY_CLASS\}>[\s\S]*?<\/div>\s*\{actionBar\}/,
    );
  });

  test('page wraps client with desktop height shell', () => {
    const page = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/page.tsx'),
      'utf-8',
    );
    expect(page).toContain('BRANCH_WITHDRAW_PAGE_SHELL_CLASS');
    expect(page).toMatch(/<div className=\{BRANCH_WITHDRAW_PAGE_SHELL_CLASS\}>[\s\S]*BranchWithdrawClient/);
  });

  test('embedded overlay keeps flex min-h-0 scroll chain', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );
    expect(client).toMatch(/embedded[\s\S]*flex min-h-0 flex-1 flex-col overflow-hidden/);
    expect(client).toMatch(/embedded[\s\S]*flex min-h-0 flex-1 flex-col overflow-hidden[\s\S]*BRANCH_WITHDRAW_SCROLL_BODY_CLASS/);
  });
});
