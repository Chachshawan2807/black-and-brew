import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('NotificationPanel mobile layout', () => {
  test('uses centered modal with smooth fade motion', () => {
    const code = readFile('components/notifications/NotificationPanel.tsx');
    expect(code).toContain('notificationPanel');
    expect(code).toContain('notificationOverlay');
    expect(code).toContain('withReducedMotion');
    expect(code).toContain('usePrefersReducedMotion');
    expect(code).toMatch(/items-center justify-center/);
    expect(code).toMatch(/rounded-3xl/);
    expect(code).not.toContain('FAB_PANEL_ABOVE_NOTIFICATION_CLASS');
  });

  test('uses single keyed overlay so AnimatePresence can run exit animation', () => {
    const code = readFile('components/notifications/NotificationPanel.tsx');
    expect(code).toContain('key="notification-overlay"');
    expect(code).not.toMatch(/panelOpen && \(\s*<>/);
  });

  test('notification panel renders schedule summaries as multi-line fieldSummary', () => {
    const code = readFile('components/notifications/NotificationPanel.tsx');
    expect(code).toContain('isScheduleNotification');
    expect(code).toContain("item.fieldSummary.split('\\n')");
  });

  test('uses icon-only header actions with accessible labels', () => {
    const code = readFile('components/notifications/NotificationPanel.tsx');
    expect(code).toContain('CheckCheck');
    expect(code).toContain('Trash2');
    expect(code).toContain('<CheckCheck size={17}');
    expect(code).toContain('<Trash2 size={17}');
    expect(code).toContain("aria-label={isTh ? 'อ่านทั้งหมด' : 'Mark all read'}");
    expect(code).toContain("aria-label={isTh ? 'ล้างประวัติ' : 'Clear history'}");
  });
});
