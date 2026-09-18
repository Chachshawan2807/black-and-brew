import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveScheduleBoardGridClass } from '@/lib/secretary/schedule-board-grid-class';

const ROOT = path.resolve(__dirname, '..');

function readHome(rel: string): string {
  return fs.readFileSync(path.resolve(ROOT, rel), 'utf-8');
}

describe('home page mobile modal baseline', () => {
  test('secretary shell uses svh/dvh, safe-area, keyboard-aware centered scroll', () => {
    const layout = readHome('app/[locale]/home/_components/secretary-modal-layout.ts');
    const shell = readHome('app/[locale]/home/_components/SecretaryTaskPanelShell.tsx');
    expect(layout).toContain('85svh');
    expect(layout).toContain('100dvh');
    expect(layout).toContain('safe-area-inset');
    expect(layout).toContain('keyboardAware: true');
    expect(shell).toContain('BB_BTN_CLOSE');
    const closeBtn = readHome('lib/ui-outlined-tokens.ts');
    expect(closeBtn).toContain('min-h-[44px]');
    expect(closeBtn).toContain('touch-manipulation');
    expect(shell).toContain('safe-area-inset-bottom');
    expect(shell).toContain('100dvw');
  });

  test('schedule board grid caps columns on narrow viewports', () => {
    expect(resolveScheduleBoardGridClass(4)).toContain('grid-cols-2');
    expect(resolveScheduleBoardGridClass(4)).toContain('md:grid-cols-4');
    const list = readHome('app/[locale]/home/_components/SecretaryTaskListOverlay.tsx');
    expect(list).toContain('resolveScheduleBoardGridClass');
    expect(list).not.toContain('gridTemplateColumns');
  });

  test('info overlay table scrolls horizontally when needed', () => {
    const shell = readHome('app/[locale]/home/_components/SecretaryTaskPanelShell.tsx');
    expect(shell).toContain('overflow-x-auto');
    expect(shell).toContain('<th scope="col"');
  });

  test('HomeClient registers mobile back stack for overlays', () => {
    const client = readHome('app/[locale]/home/HomeClient.tsx');
    expect(client).toContain('useMobileBackOverlayStack');
    expect(client).toContain('home-overlay');
  });

  test('member shift cards use fixed width and wrap on small screens', () => {
    const section = readHome('app/[locale]/home/_components/HomeShiftStatusSection.tsx');
    expect(section).toContain('flex flex-wrap gap-2');
    expect(section).toContain('w-[8.25rem]');
    expect(section).toContain('สมาชิกพรุ่งนี้');
  });

  test('manual task dialog uses touch-friendly fields and panel shell', () => {
    const dialog = readHome('app/[locale]/home/_components/SecretaryManualTaskDialog.tsx');
    expect(dialog).toContain('SecretaryTaskPanelShell');
    expect(dialog).toContain('py-2.5');
    expect(dialog).toContain('aria-invalid');
  });
});
