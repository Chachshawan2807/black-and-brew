import { describe, expect, test } from 'vitest';
import {
  haversineMeters,
  classifyZone,
  computeThreatLevel,
  buildCompetitorAnalysis,
  buildCompetitorPromptDigest,
  ZONE_IMMEDIATE_M,
  ZONE_PRIMARY_M,
  IMPACT_RADIUS_M,
} from '@/app/actions/market-insights-competitors';
import { mapOsmElementsToRawPlaces } from '@/app/actions/market-insights-osm';

const STORE_LAT = '13.929692';
const STORE_LON = '100.716932';

describe('haversineMeters', () => {
  test('returns ~0 for same point', () => {
    expect(haversineMeters(13.93, 100.72, 13.93, 100.72)).toBeLessThan(1);
  });

  test('returns plausible distance for offset', () => {
    const d = haversineMeters(13.929692, 100.716932, 13.935, 100.716932);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(700);
  });
});

describe('classifyZone', () => {
  test('classifies immediate, primary, extended bands', () => {
    expect(classifyZone(200)).toBe('immediate');
    expect(classifyZone(ZONE_IMMEDIATE_M)).toBe('immediate');
    expect(classifyZone(ZONE_IMMEDIATE_M + 1)).toBe('primary');
    expect(classifyZone(ZONE_PRIMARY_M)).toBe('primary');
    expect(classifyZone(ZONE_PRIMARY_M + 1)).toBe('extended');
    expect(classifyZone(IMPACT_RADIUS_M)).toBe('extended');
  });
});

describe('computeThreatLevel', () => {
  test('immediate zone is always high threat', () => {
    expect(computeThreatLevel({ distanceMeters: 300 })).toBe('high');
  });

  test('distant low-rated shop is low threat', () => {
    expect(
      computeThreatLevel({ distanceMeters: 2500, rating: 3, userRatingsTotal: 10 })
    ).toBe('low');
  });
});

describe('mapOsmElementsToRawPlaces', () => {
  test('maps named OSM nodes with coordinates', () => {
    const places = mapOsmElementsToRawPlaces([
      {
        type: 'node',
        id: 1,
        lat: 13.93,
        lon: 100.717,
        tags: { name: 'OSM Cafe', 'addr:street': 'ถนนทดสอบ' },
      },
      { type: 'node', id: 2, lat: 13.94, lon: 100.72 },
    ]);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('OSM Cafe');
    expect(places[0].vicinity).toBe('ถนนทดสอบ');
  });
});

describe('buildCompetitorAnalysis', () => {
  test('sorts by distance and counts zones', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      {
        place_id: 'a',
        name: 'Starbucks',
        rating: 4.5,
        user_ratings_total: 100,
        geometry: { location: { lat: 13.9305, lng: 100.716932 } },
      },
      {
        place_id: 'b',
        name: 'Café Amazon',
        rating: 4.0,
        user_ratings_total: 50,
        geometry: { location: { lat: 13.95, lng: 100.72 } },
      },
    ]);

    expect(analysis.totalCount).toBe(2);
    expect(analysis.competitors[0].name).toBe('Starbucks');
    expect(analysis.scannedCount).toBe(2);
    expect(analysis.segmentCriteria).toBeTruthy();
    expect(analysis.byZone.immediate + analysis.byZone.primary + analysis.byZone.extended).toBe(2);
    expect(analysis.deterministicInsights.length).toBeGreaterThan(0);
    expect(analysis.topThreats[0].name).toBeTruthy();
    expect(analysis.dataSource).toBe('openstreetmap');
  });

  test('defaults dataSource to openstreetmap and adds OSM insight note', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      {
        name: 'กาแฟพันธุ์ไทย ลำลูกกา',
        geometry: { location: { lat: 13.93, lng: 100.717 } },
      },
    ]);
    expect(analysis.dataSource).toBe('openstreetmap');
    expect(analysis.deterministicInsights.some((l) => l.includes('OpenStreetMap'))).toBe(true);
  });

  test('excludes places beyond impact radius', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      {
        name: 'Starbucks',
        geometry: { location: { lat: 14.0, lng: 100.8 } },
      },
    ]);
    expect(analysis.totalCount).toBe(0);
  });

  test('filters out lower-tier generic cafes', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      { name: 'ร้านกาแฟเล็ก', geometry: { location: { lat: 13.93, lng: 100.717 } } },
      { name: 'Starbucks', geometry: { location: { lat: 13.931, lng: 100.717 } } },
    ]);
    expect(analysis.totalCount).toBe(1);
    expect(analysis.competitors[0].name).toBe('Starbucks');
    expect(analysis.scannedCount).toBe(2);
  });
});

describe('buildCompetitorPromptDigest', () => {
  test('returns N/A for empty analysis', () => {
    expect(buildCompetitorPromptDigest(null)).toBe('N/A');
  });

  test('includes zone counts and top threats', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      {
        name: 'Starbucks',
        rating: 4.2,
        geometry: { location: { lat: 13.93, lng: 100.717 } },
      },
    ]);
    const digest = buildCompetitorPromptDigest(analysis);
    expect(digest).toContain('count=1');
    expect(digest).toContain('zones=');
    expect(digest).toContain('segment=');
    expect(digest).toContain('Starbucks');
  });
});
