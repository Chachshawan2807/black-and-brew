import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');

describe('ExportProgressOverlay', () => {
  test('portals above all app overlays without closing underlying windows', () => {
    const overlay = readFileSync(
      resolve(ROOT, 'src/components/ui/ExportProgressOverlay.tsx'),
      'utf-8',
    );
    const layout = readFileSync(resolve(ROOT, 'src/lib/floating-action-layout.ts'), 'utf-8');

    expect(layout).toContain('EXPORT_PROGRESS_OVERLAY_Z_CLASS');
    expect(layout).toContain("z-[260]");
    expect(overlay).toContain('ModalPortal');
    expect(overlay).toContain('EXPORT_PROGRESS_OVERLAY_Z_CLASS');
    expect(overlay).toContain('bb-export-progress-overlay');
    expect(overlay).toContain('100dvh');
    expect(overlay).not.toContain('onClose');
    expect(overlay).not.toContain('setShow');
  });

  test('save variant uses Save icon for data persistence overlays', () => {
    const overlay = readFileSync(
      resolve(ROOT, 'src/components/ui/ExportProgressOverlay.tsx'),
      'utf-8',
    );
    const schedule = readFileSync(
      resolve(ROOT, 'src/app/[locale]/schedule/ScheduleClient.tsx'),
      'utf-8',
    );

    expect(overlay).toContain("variant === 'save'");
    expect(overlay).toContain('<Save');
    expect(overlay).toContain('<ImageDown');
    expect(schedule).toMatch(/visible=\{loading\}[\s\S]*variant="save"/);
    expect(schedule).toContain('title="กำลังบันทึกข้อมูล"');
  });
});
