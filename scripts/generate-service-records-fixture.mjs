import fs from 'node:fs';
import path from 'node:path';

/** @type {import('../src/lib/maintenance/types').MaintenanceServiceRecord[]} */
const records = JSON.parse(fs.readFileSync(new URL('./service-records.snapshot.json', import.meta.url), 'utf8'));

const names = [...new Set(records.map((record) => record.equipment.trim()))].sort((a, b) =>
  a.localeCompare(b, 'th'),
);

const pick = (id) => {
  const record = records.find((entry) => entry.id === id);
  if (!record) throw new Error(`Missing snapshot record: ${id}`);
  return record;
};

const samples = [
  'f680e7f0-4d97-49db-9b3b-e673bc66ea4f',
  'db718e9c-38d5-4fe5-8848-0e05a11b26b1',
  'b8401c66-1d63-4670-b557-1b75f9d2622a',
].map(pick);

const monthSamples = [
  '89b09400-ab37-4a11-83b2-8d1aa98eee9c',
  'b8401c66-1d63-4670-b557-1b75f9d2622a',
].map(pick);

const dedup = [
  '7bc7bf79-6a5d-42e9-b767-f30a7b1adeff',
  'db718e9c-38d5-4fe5-8848-0e05a11b26b1',
].map(pick);

const weekSoon = pick('6495ddf3-d2b3-487c-a16c-dcfed51fb08a');
const weekLater = pick('b8401c66-1d63-4670-b557-1b75f9d2622a');

const serialize = (value) => JSON.stringify(value, null, 2);

const output = `/** Snapshot from Supabase public.service_records (BLACK-AND-BREW). */
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

export const REAL_SERVICE_RECORD_REFERENCE_DATE = '2026-09-01';

export const REAL_EQUIPMENT_NAMES = ${serialize(names)} as const;

export const REAL_SERVICE_RECORDS: MaintenanceServiceRecord[] = ${serialize(records)};

/** Latest scheduled rows used in compute/filter integration tests. */
export const REAL_SCHEDULED_SAMPLE_RECORDS: MaintenanceServiceRecord[] = ${serialize(samples)};

/** Overdue + horizon mix for month/week filter tests. */
export const REAL_MONTH_FILTER_SAMPLE_RECORDS: MaintenanceServiceRecord[] = ${serialize(monthSamples)};

/** Old + new history for the same asset (PP filter). */
export const REAL_PP_FILTER_DEDUP_RECORDS: MaintenanceServiceRecord[] = ${serialize(dedup)};

/** Due within a week vs later for week-filter edge test. */
export const REAL_WEEK_FILTER_SOON_RECORD: MaintenanceServiceRecord = ${serialize(weekSoon)};

export const REAL_WEEK_FILTER_LATER_RECORD: MaintenanceServiceRecord = ${serialize(weekLater)};

export function pickServiceRecords(...ids: string[]): MaintenanceServiceRecord[] {
  const byId = new Map(REAL_SERVICE_RECORDS.map((record) => [record.id!, record]));
  return ids.map((id) => {
    const record = byId.get(id);
    if (!record) throw new Error(\`Missing fixture service record: \${id}\`);
    return record;
  });
}
`;

const target = path.join(process.cwd(), 'src/test/fixtures/service-records.fixture.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, output);
console.log(`Wrote ${records.length} records (${names.length} equipment names) to ${target}`);
