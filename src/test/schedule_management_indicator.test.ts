import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

describe('schedule management blue dot indicator', () => {
  const scheduleClientPath = path.resolve(
    __dirname,
    '../app/[locale]/schedule/ScheduleClient.tsx',
  );
  const scheduleClientCode = fs.readFileSync(scheduleClientPath, 'utf-8');

  test('shift cell shows blue dot for management entries even without remark', () => {
    expect(scheduleClientCode).toContain('function hasManagementIndicator');
    expect(scheduleClientCode).toMatch(/metadata\?\.is_management/);
    expect(scheduleClientCode).toMatch(/hasManagementIndicator\(shift\.metadata\)/);
    expect(scheduleClientCode).not.toMatch(/\{shift\.metadata\?\.remark && \(/);
  });

  test('management save persists is_management and refreshes local shift state', () => {
    expect(scheduleClientCode).toContain('is_management: true');
    expect(scheduleClientCode).toMatch(/\.insert\(newShifts\)[\s\S]*\.select\('id, employee_id, start_time, end_time, status, metadata'\)/);
    expect(scheduleClientCode).toMatch(/setShifts\(\(prev\) => \{[\s\S]*insertedShifts \|\| newShifts/);
  });

  test('management blue dot stays inset and outside hover scale transform', () => {
    expect(scheduleClientCode).toMatch(/pointer-events-none absolute top-2\.5 right-2\.5/);
    expect(scheduleClientCode).toMatch(
      /<div className="relative h-full w-full">[\s\S]*group-hover\/cell:scale-\[0\.97\][\s\S]*hasManagementIndicator\(shift\.metadata\)/,
    );
  });

  test('management modal uses a single mobile scroll surface with bounded height', () => {
    expect(scheduleClientCode).toMatch(/showManagementModal[\s\S]*max-h-\[90vh\] min-h-0 overflow-hidden/);
    expect(scheduleClientCode).toMatch(
      /flex-1 min-h-0 overflow-y-auto bb-smooth-scroll flex flex-col md:flex-row md:overflow-hidden/,
    );
    expect(scheduleClientCode).not.toMatch(
      /showManagementModal[\s\S]{0,1200}max-h-\[90vh\][\s\S]{0,400}overflow-y-auto bb-smooth-scroll[\s\S]{0,200}flex flex-col md:flex-row/,
    );
  });
});
