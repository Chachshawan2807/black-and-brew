import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BB_ICON_BADGE_BASE,
  BB_ICON_BADGE_OUTLINE,
  BB_ICON_BADGE_OUTLINE_PASTEL,
} from '@/lib/ui-outlined-tokens';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

describe('dark theme icon contrast', () => {
  test('standard icon badges use theme foreground on dark surfaces', () => {
    expect(BB_ICON_BADGE_OUTLINE).toContain('dark:text-foreground');
    expect(BB_ICON_BADGE_OUTLINE).toContain('dark:[&_svg]:text-foreground');
    expect(BB_ICON_BADGE_OUTLINE).toContain('dark:border-border');
    expect(BB_ICON_BADGE_OUTLINE).not.toContain('dark:text-black');
    expect(BB_ICON_BADGE_BASE).toContain(BB_ICON_BADGE_OUTLINE);
  });

  test('pastel icon badges retain dark glyphs and borders in both themes', () => {
    expect(BB_ICON_BADGE_OUTLINE_PASTEL).toContain('dark:text-black');
    expect(BB_ICON_BADGE_OUTLINE_PASTEL).toContain('dark:[&_svg]:text-black');
    expect(BB_ICON_BADGE_OUTLINE_PASTEL).toContain('dark:border-black/75');
  });

  test('settings danger and schedule calendar badges opt into the pastel contrast variant', () => {
    const settings = read('app/[locale]/settings/_components/settings-ui-primitives.tsx');
    const schedule = read('app/[locale]/schedule/_components/schedule-ui-primitives.tsx');
    const notificationIcon = read('components/notifications/NotificationItemIcon.tsx');

    expect(settings).toContain("tone === 'danger' ? BB_ICON_BADGE_OUTLINE_PASTEL : BB_ICON_BADGE_OUTLINE");
    expect(schedule).toContain("tone === 'calendar' ? BB_ICON_BADGE_OUTLINE_PASTEL : BB_ICON_BADGE_OUTLINE");
    expect(notificationIcon).toContain('isPastelKind ? BB_ICON_BADGE_OUTLINE_PASTEL : BB_ICON_BADGE_OUTLINE');
  });
});
