import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const maintenanceClientPath = path.resolve(
  __dirname,
  '../app/[locale]/maintenance/MaintenanceClient.tsx',
);
const maintenanceModalsPath = path.resolve(
  __dirname,
  '../app/[locale]/maintenance/_components/MaintenanceModals.tsx',
);

describe('maintenance form a11y contract', () => {
  test('MaintenanceClient uses modal forms instead of inline spreadsheet grid', () => {
    const source = fs.readFileSync(maintenanceClientPath, 'utf-8');

    expect(source).toContain('MaintenanceModals');
    expect(source).not.toMatch(/<td[\s\S]*<input/);
  });

  test('MaintenanceModals links labels to equipment and frequency inputs', () => {
    const source = fs.readFileSync(maintenanceModalsPath, 'utf-8');

    expect(source).toContain('htmlFor="maintenance-equipment"');
    expect(source).toContain('id="maintenance-equipment"');
    expect(source).toContain('htmlFor="maintenance-frequency"');
    expect(source).toContain('id="maintenance-frequency"');
    expect(source).toContain('htmlFor="maintenance-task-type-custom"');
    expect(source).toContain('id="maintenance-task-type-custom"');
  });
});
