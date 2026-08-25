import { describe, expect, it } from 'vitest';
import {
  JOB_DEFINITIONS,
  buildDesiredJobs,
  buildJobPayload,
  dailyScheduleAt,
  findJobByTitle,
  jobNeedsUpdate,
} from '../../scripts/cron-job-org-config.mjs';

describe('cron-job-org-config', () => {
  it('defines four Bangkok-scheduled ERP jobs', () => {
    expect(JOB_DEFINITIONS).toHaveLength(4);
    expect(JOB_DEFINITIONS.map((job) => job.path)).toEqual([
      '/api/daily-report?schedule=today',
      '/api/daily-report?schedule=tomorrow',
      '/api/insight-alerts?window=morning',
      '/api/insight-alerts?window=evening',
    ]);
  });

  it('buildDesiredJobs attaches site URL and Authorization header', () => {
    const jobs = buildDesiredJobs('https://blackandbrew.vercel.app/', 'secret-abc');
    expect(jobs[0].url).toBe(
      'https://blackandbrew.vercel.app/api/daily-report?schedule=today',
    );
    expect(jobs[0].extendedData.headers.Authorization).toBe('Bearer secret-abc');
    expect(jobs[1].schedule).toEqual(dailyScheduleAt(18, 0));
  });

  it('dailyScheduleAt uses Asia/Bangkok timezone', () => {
    expect(dailyScheduleAt(5, 0)).toEqual({
      timezone: 'Asia/Bangkok',
      expiresAt: 0,
      hours: [5],
      mdays: [-1],
      minutes: [0],
      months: [-1],
      wdays: [-1],
    });
  });

  it('findJobByTitle matches exact titles', () => {
    const jobs = [{ title: 'BLACKANDBREW Daily Report (today)', jobId: 1 }];
    expect(findJobByTitle(jobs, 'BLACKANDBREW Daily Report (today)')?.jobId).toBe(1);
    expect(findJobByTitle(jobs, 'other')).toBeNull();
  });

  it('jobNeedsUpdate detects URL drift', () => {
    const [desired] = buildDesiredJobs('https://blackandbrew.vercel.app', 'secret');
    const existing = {
      ...buildJobPayload(desired),
      url: 'https://wrong.example/api/daily-report?schedule=today',
      extendedData: desired.extendedData,
    };
    expect(jobNeedsUpdate(existing, desired)).toBe(true);
  });

  it('jobNeedsUpdate returns false when config matches', () => {
    const [desired] = buildDesiredJobs('https://blackandbrew.vercel.app', 'secret');
    const existing = buildJobPayload(desired);
    expect(jobNeedsUpdate(existing, desired)).toBe(false);
  });
});
