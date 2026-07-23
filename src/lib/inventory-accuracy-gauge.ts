export type AccuracyGaugeZone = {
  min: number;
  max: number;
  color: string;
  label: string;
};

/** KPI bands aligned with common SLA / operations accuracy targets (0–100%). */
export const ACCURACY_GAUGE_ZONES: AccuracyGaugeZone[] = [
  { min: 0, max: 70, color: '#ef4444', label: 'ต่ำมาก' },
  { min: 70, max: 80, color: '#f97316', label: 'ต่ำ' },
  { min: 80, max: 90, color: '#facc15', label: 'ปานกลาง' },
  { min: 90, max: 95, color: '#86efac', label: 'ดี' },
  { min: 95, max: 100, color: '#22c55e', label: 'ดีเยี่ยม' },
];

export function computeGaugeAngleForPct(accuracyPct: number): number {
  const clamped = clampAccuracyGaugeValue(accuracyPct);
  return 180 - (clamped / 100) * 180;
}

export function clampAccuracyGaugeValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** 180° = left (0%), 0° = right (100%). */
export function computeAccuracyGaugeNeedleAngle(accuracyPct: number): number {
  return computeGaugeAngleForPct(accuracyPct);
}

export function getAccuracyGaugeZone(accuracyPct: number): AccuracyGaugeZone {
  const clamped = clampAccuracyGaugeValue(accuracyPct);
  const zone =
    ACCURACY_GAUGE_ZONES.find((entry) => clamped >= entry.min && clamped < entry.max) ??
    ACCURACY_GAUGE_ZONES[ACCURACY_GAUGE_ZONES.length - 1];
  return clamped >= 100 ? ACCURACY_GAUGE_ZONES[ACCURACY_GAUGE_ZONES.length - 1] : zone;
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY - radius * Math.sin(radians),
  };
}

export function describeGaugeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = polarToCartesian(centerX, centerY, radius, startAngleDeg);
  const end = polarToCartesian(centerX, centerY, radius, endAngleDeg);
  const sweep = endAngleDeg < startAngleDeg ? 1 : 0;
  const largeArc = Math.abs(startAngleDeg - endAngleDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

export function describeGaugeWedge(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngleDeg);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngleDeg);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngleDeg);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngleDeg);
  const sweep = endAngleDeg < startAngleDeg ? 1 : 0;
  const largeArc = Math.abs(startAngleDeg - endAngleDeg) > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} ${sweep} ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} ${sweep === 1 ? 0 : 1} ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export const ACCURACY_GAUGE_TICKS = [0, 25, 50, 75, 100] as const;

export function accuracyGaugeZoneGradientId(label: string): string {
  return `accuracy-gauge-zone-${label.replace(/\s+/g, '-')}`;
}
