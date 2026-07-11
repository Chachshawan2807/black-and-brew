import {
  ACCURACY_GAUGE_ZONES,
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

export function AccuracyGauge({ accuracyPct, className = '' }: AccuracyGaugeProps) {
  const value = clampAccuracyGaugeValue(accuracyPct);
  const zone = getAccuracyGaugeZone(value);
  const needleAngle = computeAccuracyGaugeNeedleAngle(value);
  const needleTip = polarToCartesian(CX, CY, NEEDLE_R, needleAngle);

  return (
    <svg
      viewBox="0 0 200 124"
      className={`h-auto w-full max-w-[190px] ${className}`.trim()}
      role="img"
      aria-label={`ความแม่นยำ ${value}% ระดับ${zone.label}`}
    >
      <title>ความแม่นยำ {value}%</title>
      {ACCURACY_GAUGE_ZONES.map((segment) => {
        const startAngle = computeGaugeAngleForPct(segment.min);
        const endAngle = computeGaugeAngleForPct(segment.max);
        const midAngle = computeGaugeAngleForPct((segment.min + segment.max) / 2);
        const labelPoint = polarToCartesian(CX, CY, OUTER_R + 13, midAngle);

        return (
          <g key={segment.label}>
            <path
              d={describeGaugeWedge(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
              fill={segment.color}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={0.5}
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-black/70 bb-pastel-surface"
              style={{ fontSize: 7, fontWeight: 500 }}
            >
              {segment.label}
            </text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={7} fill="#111827" />
      <circle cx={CX} cy={CY} r={3.5} fill="#f8fafc" />

      <line
        x1={CX}
        y1={CY}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="#111827"
        strokeWidth={3}
        strokeLinecap="round"
      />

      <text
        x={CX}
        y={108}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-black bb-pastel-surface"
        style={{ fontSize: 17, fontWeight: 400 }}
      >
        {value}%
      </text>
    </svg>
  );
}
