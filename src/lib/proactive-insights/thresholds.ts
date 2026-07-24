/** Tunable thresholds for cross-module proactive insight rules. */
export const INSIGHT_THRESHOLDS = {
  weeklyHeadcountLimits: [3, 3, 4, 4, 3, 4, 4] as const,
  leaveCoverageMinLeave: 2,
  beanOrdersMinPending: 1,
} as const;
