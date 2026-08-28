/** @typedef {{ title: string; path: string; hour: number; minute?: number }} JobDefinition */

export const CRON_JOB_ORG_API = 'https://api.cron-job.org';
export const CRON_TIMEZONE = 'Asia/Bangkok';
export const JOB_TITLE_PREFIX = 'BLACKANDBREW';

/** Canonical cron-job.org jobs for this ERP (Asia/Bangkok). */
export const JOB_DEFINITIONS = [
  {
    title: `${JOB_TITLE_PREFIX} Daily Report (today)`,
    path: '/api/daily-report?schedule=today',
    hour: 5,
    minute: 0,
  },
  {
    title: `${JOB_TITLE_PREFIX} Daily Report (tomorrow)`,
    path: '/api/daily-report?schedule=tomorrow',
    hour: 18,
    minute: 0,
  },
  {
    title: `${JOB_TITLE_PREFIX} Insight Alerts (morning)`,
    path: '/api/insight-alerts?window=morning',
    hour: 7,
    minute: 0,
  },
  {
    title: `${JOB_TITLE_PREFIX} Insight Alerts (evening)`,
    path: '/api/insight-alerts?window=evening',
    hour: 17,
    minute: 0,
  },
  {
    title: `${JOB_TITLE_PREFIX} Secretary Alerts (morning)`,
    path: '/api/secretary/alerts?locale=th',
    hour: 8,
    minute: 0,
  },
];

/**
 * @param {number} hour 0–23 in Asia/Bangkok
 * @param {number} [minute=0]
 */
export function dailyScheduleAt(hour, minute = 0) {
  return {
    timezone: CRON_TIMEZONE,
    expiresAt: 0,
    hours: [hour],
    mdays: [-1],
    minutes: [minute],
    months: [-1],
    wdays: [-1],
  };
}

/**
 * @param {string} baseUrl e.g. https://blackandbrew.vercel.app
 * @param {string} cronSecret CRON_SECRET for app API auth
 * @returns {Array<JobDefinition & { url: string; schedule: ReturnType<typeof dailyScheduleAt> }>}
 */
export function buildDesiredJobs(baseUrl, cronSecret) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const authValue = `Bearer ${cronSecret}`;

  return JOB_DEFINITIONS.map((def) => ({
    ...def,
    url: `${normalizedBase}${def.path}`,
    schedule: dailyScheduleAt(def.hour, def.minute ?? 0),
    extendedData: {
      headers: {
        Authorization: authValue,
      },
      body: '',
    },
  }));
}

/**
 * @param {JobDefinition & { url: string; schedule: ReturnType<typeof dailyScheduleAt>; extendedData: { headers: Record<string, string>; body: string } }} definition
 */
export function buildJobPayload(definition) {
  return {
    enabled: true,
    title: definition.title,
    saveResponses: true,
    url: definition.url,
    requestMethod: 0,
    requestTimeout: 120,
    redirectSuccess: false,
    schedule: definition.schedule,
    extendedData: definition.extendedData,
  };
}

/**
 * @param {Array<{ title?: string; url?: string }>} jobs
 * @param {string} title
 */
export function findJobByTitle(jobs, title) {
  return jobs.find((job) => job.title === title) ?? null;
}

/**
 * @param {object} existing
 * @param {object} desired
 */
export function jobNeedsUpdate(existing, desired) {
  const payload = buildJobPayload(desired);
  if (existing.url !== payload.url) return true;
  if (existing.enabled !== payload.enabled) return true;
  if (existing.saveResponses !== payload.saveResponses) return true;
  if (existing.requestMethod !== payload.requestMethod) return true;

  const existingHeaders = existing.extendedData?.headers ?? {};
  const desiredHeaders = payload.extendedData.headers;
  if (existingHeaders.Authorization !== desiredHeaders.Authorization) return true;

  const existingSchedule = existing.schedule ?? {};
  const desiredSchedule = payload.schedule;
  for (const key of ['timezone', 'hours', 'minutes', 'mdays', 'months', 'wdays']) {
    const a = JSON.stringify(existingSchedule[key] ?? null);
    const b = JSON.stringify(desiredSchedule[key] ?? null);
    if (a !== b) return true;
  }

  return false;
}
