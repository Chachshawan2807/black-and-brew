import { describe, expect, test } from 'vitest';
import {
  ACCURACY_GAUGE_ZONES,
  clampAccuracyGaugeValue,
  computeAccuracyGaugeNeedleAngle,
  getAccuracyGaugeZone,
} from '@/lib/inventory-accuracy-gauge';

describe('inventory accuracy gauge', () => {
  test('clamps gauge input between 0 and 100', () => {
    expect(clampAccuracyGaugeValue(-5)).toBe(0);
    expect(clampAccuracyGaugeValue(150)).toBe(100);
    expect(clampAccuracyGaugeValue(Number.NaN)).toBe(0);
  });

  test('needle angle maps 0% to left and 100% to right', () => {
    expect(computeAccuracyGaugeNeedleAngle(0)).toBe(180);
    expect(computeAccuracyGaugeNeedleAngle(50)).toBe(90);
    expect(computeAccuracyGaugeNeedleAngle(100)).toBe(0);
  });

  test('zone labels follow international KPI accuracy bands', () => {
    expect(getAccuracyGaugeZone(10).label).toBe('ต่ำมาก');
    expect(getAccuracyGaugeZone(75).label).toBe('ต่ำ');
    expect(getAccuracyGaugeZone(85).label).toBe('ปานกลาง');
    expect(getAccuracyGaugeZone(92).label).toBe('ดี');
    expect(getAccuracyGaugeZone(98).label).toBe('ดีเยี่ยม');
    expect(ACCURACY_GAUGE_ZONES).toHaveLength(5);
    expect(ACCURACY_GAUGE_ZONES[0]?.max).toBe(70);
    expect(ACCURACY_GAUGE_ZONES[4]?.min).toBe(95);
  });
});
