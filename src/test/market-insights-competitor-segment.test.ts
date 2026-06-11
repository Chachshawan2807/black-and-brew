import { describe, expect, test } from 'vitest';
import {
  matchCompetitorSegment,
  filterComparableCompetitors,
} from '@/app/actions/market-insights-competitor-segment';
import type { RawPlaceResult } from '@/app/actions/market-insights-competitors';

describe('matchCompetitorSegment', () => {
  test('includes national chains', () => {
    expect(matchCompetitorSegment({ name: 'Starbucks Reserve' }).included).toBe(true);
    expect(matchCompetitorSegment({ name: 'Café Amazon' }).included).toBe(true);
    expect(matchCompetitorSegment({ name: 'กาแฟพันธุ์ไทย' }).included).toBe(true);
  });

  test('includes specialty keywords', () => {
    expect(matchCompetitorSegment({ name: 'Slow Bar Specialty Coffee' }).included).toBe(true);
    expect(matchCompetitorSegment({ name: 'ร้านโรงคั่ว ลำลูกกา' }).included).toBe(true);
  });

  test('excludes lower-tier convenience', () => {
    expect(matchCompetitorSegment({ name: '7-Eleven' }).included).toBe(false);
    expect(matchCompetitorSegment({ name: 'เซเว่น ลำลูกกา' }).included).toBe(false);
    expect(matchCompetitorSegment({ name: 'ร้านชานมไข่มุก' }).included).toBe(false);
  });

  test('excludes generic unnamed-tier cafes without signals', () => {
    expect(matchCompetitorSegment({ name: 'ร้านกาแฟเล็กๆ' }).included).toBe(false);
    expect(matchCompetitorSegment({ name: 'Cafe Near', price_level: 1 }).included).toBe(false);
  });

  test('includes via Google price_level and reviews', () => {
    const place: RawPlaceResult = {
      name: 'The Coffee Club',
      price_level: 3,
      rating: 4.5,
      user_ratings_total: 200,
    };
    expect(matchCompetitorSegment(place).included).toBe(true);
  });
});

describe('filterComparableCompetitors', () => {
  test('filters mixed list to comparable segment only', () => {
    const filtered = filterComparableCompetitors([
      { name: 'Starbucks' },
      { name: 'ร้านกาแฟหน้าบ้าน' },
      { name: '7-Eleven' },
      { name: 'Roots Coffee Roaster' },
    ]);
    expect(filtered.map((p) => p.name)).toEqual(['Starbucks', 'Roots Coffee Roaster']);
  });
});
