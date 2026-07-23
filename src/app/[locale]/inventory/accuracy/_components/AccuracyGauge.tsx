import {
  ACCURACY_GAUGE_TICKS,
  ACCURACY_GAUGE_ZONES,
  accuracyGaugeZoneGradientId,
  clampAccuracyGaugeValue,
  computeAccuracyGaugeNeedleAngle,
  computeGaugeAngleForPct,
  describeGaugeWedge,
  getAccuracyGaugeZone,
  polarToCartesian,
} from '@/lib/inventory-accuracy-gauge';

type AccuracyGaugeProps = {
  accuracyPct: number;
  className?: string;
};

const CX = 100;
const CY = 86;
const OUTER_R = 68;
const INNER_R = 48;
const NEEDLE_R = 58;
const BEZEL_R = 74;
const TICK_OUTER_R = 72;
const TICK_INNER_R = 66;

function lightenHex(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const channels = [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
  const next = channels.map((channel) =>
    Math.min(255, Math.round(channel + (255 - channel) * amount)),
  );
  return `#${next.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function darkenHex(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const channels = [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
  const next = channels.map((channel) => Math.max(0, Math.round(channel * (1 - amount))));
  return `#${next.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function AccuracyGauge({ accuracyPct, className = '' }: AccuracyGaugeProps) {
  const value = clampAccuracyGaugeValue(accuracyPct);
  const zone = getAccuracyGaugeZone(value);
  const needleAngle = computeAccuracyGaugeNeedleAngle(value);
  const needleTip = polarToCartesian(CX, CY, NEEDLE_R, needleAngle);
  const needleShadowTip = polarToCartesian(CX, CY + 1.5, NEEDLE_R - 1, needleAngle);

  return (
    <svg
      viewBox="0 0 200 124"
      className={`h-auto w-full max-w-[210px] drop-shadow-sm ${className}`.trim()}
      role="img"
      aria-label={`ความแม่นยำ ${value}% ระดับ${zone.label}`}
    >
      <title>ความแม่นยำ {value}%</title>
      <defs>
        <filter id="accuracy-gauge-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
        <filter id="accuracy-needle-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0f172a" floodOpacity="0.35" />
        </filter>
        <radialGradient id="accuracy-gauge-face" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
        <linearGradient id="accuracy-gauge-bezel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        {ACCURACY_GAUGE_ZONES.map((segment) => {
          const gradientId = accuracyGaugeZoneGradientId(segment.label);
          return (
            <linearGradient
              key={gradientId}
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={lightenHex(segment.color, 0.22)} />
              <stop offset="55%" stopColor={segment.color} />
              <stop offset="100%" stopColor={darkenHex(segment.color, 0.18)} />
            </linearGradient>
          );
        })}
      </defs>

      <ellipse cx={CX} cy={CY + 18} rx={58} ry={7} fill="#0f172a" opacity={0.08} />

      <path
        d={describeGaugeWedge(CX, CY, BEZEL_R, OUTER_R + 1.5, 180, 0)}
        fill="url(#accuracy-gauge-bezel)"
        stroke="rgba(15,23,42,0.12)"
        strokeWidth={0.6}
      />

      <g filter="url(#accuracy-gauge-shadow)">
        {ACCURACY_GAUGE_ZONES.map((segment) => {
          const startAngle = computeGaugeAngleForPct(segment.min);
          const endAngle = computeGaugeAngleForPct(segment.max);
          const midAngle = computeGaugeAngleForPct((segment.min + segment.max) / 2);
          const labelPoint = polarToCartesian(CX, CY, OUTER_R + 14, midAngle);
          const gradientId = accuracyGaugeZoneGradientId(segment.label);

          return (
            <g key={segment.label}>
              <path
                d={describeGaugeWedge(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
                fill={`url(#${gradientId})`}
                stroke="rgba(0,0,0,0.1)"
                strokeWidth={0.5}
              />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-black/75 bb-pastel-surface"
                style={{ fontSize: 6.5, fontWeight: 600, letterSpacing: '0.02em' }}
              >
                {segment.label}
              </text>
            </g>
          );
        })}
      </g>

      <path
        d={describeGaugeWedge(CX, CY, INNER_R - 1, INNER_R - 10, 180, 0)}
        fill="url(#accuracy-gauge-face)"
        stroke="rgba(15,23,42,0.08)"
        strokeWidth={0.5}
      />

      {ACCURACY_GAUGE_TICKS.map((tick) => {
        const angle = computeGaugeAngleForPct(tick);
        const outer = polarToCartesian(CX, CY, TICK_OUTER_R, angle);
        const inner = polarToCartesian(CX, CY, TICK_INNER_R, angle);
        const labelPoint = polarToCartesian(CX, CY, TICK_OUTER_R + 9, angle);
        return (
          <g key={tick}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(15,23,42,0.28)"
              strokeWidth={tick % 50 === 0 ? 1.4 : 0.9}
              strokeLinecap="round"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-black/55 bb-pastel-surface"
              style={{ fontSize: 6.5, fontWeight: 500 }}
            >
              {tick}
            </text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={10} fill="#1f2937" filter="url(#accuracy-needle-shadow)" />
      <circle cx={CX} cy={CY} r={7.5} fill="#334155" />
      <circle cx={CX - 1.5} cy={CY - 1.5} r={3} fill="#f8fafc" opacity={0.85} />

      <line
        x1={CX}
        y1={CY}
        x2={needleShadowTip.x}
        y2={needleShadowTip.y}
        stroke="rgba(15,23,42,0.25)"
        strokeWidth={3.6}
        strokeLinecap="round"
      />
      <line
        x1={CX}
        y1={CY}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="#111827"
        strokeWidth={2.6}
        strokeLinecap="round"
        filter="url(#accuracy-needle-shadow)"
      />
      <circle cx={needleTip.x} cy={needleTip.y} r={1.6} fill="#111827" />

      <text
        x={CX}
        y={110}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-black bb-pastel-surface"
        style={{ fontSize: 18, fontWeight: 500, letterSpacing: '0.02em' }}
      >
        {value}%
      </text>
      <text
        x={CX}
        y={119}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-black/65 bb-pastel-surface"
        style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.12em' }}
      >
        {zone.label.toUpperCase()}
      </text>
    </svg>
  );
}
