import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * LiveShiftList should patch local shift state on realtime events
 * instead of calling router.refresh() (full RSC re-render).
 */
describe('LiveShiftList realtime strategy', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('source uses local refreshShiftsForRange not router.refresh on postgres_changes', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(
      process.cwd(),
      'src/app/[locale]/dashboard/_components/LiveShiftList.tsx'
    );
    const source = await fs.readFile(filePath, 'utf8');

    expect(source).toContain('refreshShiftsForRange');
    expect(source).toContain('shifts-realtime-live-shift-list');
    expect(source).not.toMatch(/router\.refresh\(\)/);
  });
});
