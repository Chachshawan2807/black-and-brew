import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('maintenance modals', () => {
  test('add/edit modal portals above FAB overlays with shared z-index', () => {
    const modalsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/maintenance/_components/MaintenanceModals.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(layoutCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(modalsCode).toContain('ModalPortal');
    expect(modalsCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(modalsCode).not.toContain('z-[100]');
  });
});
