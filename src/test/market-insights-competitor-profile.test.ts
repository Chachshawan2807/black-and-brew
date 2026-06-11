import { describe, expect, test } from 'vitest';
import {
  analyzeCompetitorProfile,
  analyzeReviewsFromText,
  extractFacebookUrl,
  isOwnStore,
} from '@/app/actions/market-insights-competitor-profile';
import type { CompetitorEntry } from '@/app/actions/market-insights-types';
import { buildCompetitorAnalysis } from '@/app/actions/market-insights-competitors';

const STORE_LAT = '13.929692';
const STORE_LON = '100.716932';

describe('isOwnStore', () => {
  test('matches Black and brew.coffee variants', () => {
    expect(isOwnStore('Black and brew.coffee')).toBe(true);
    expect(isOwnStore('BLACKANDBREW')).toBe(true);
    expect(isOwnStore('Black & Brew')).toBe(true);
  });

  test('does not match competitors', () => {
    expect(isOwnStore('Starbucks')).toBe(false);
    expect(isOwnStore('Café Amazon')).toBe(false);
  });
});

describe('extractFacebookUrl', () => {
  test('extracts facebook.com page URLs', () => {
    expect(extractFacebookUrl('https://www.facebook.com/MyCafePage')).toBe(
      'https://www.facebook.com/MyCafePage'
    );
    expect(extractFacebookUrl('https://m.facebook.com/shop.th/')).toBe(
      'https://www.facebook.com/shop.th'
    );
  });

  test('returns undefined for non-facebook websites', () => {
    expect(extractFacebookUrl('https://example.com')).toBeUndefined();
    expect(extractFacebookUrl(undefined)).toBeUndefined();
  });
});

describe('analyzeReviewsFromText', () => {
  test('extracts themes from positive and negative review text', () => {
    const profile = analyzeReviewsFromText([
      { text: 'กาแฟอร่อย บรรยากาศดี พนักงานเป็นกันเอง', rating: 5 },
      { text: 'รอนานมาก ราคาแพงไปหน่อย', rating: 2 },
    ]);
    expect(profile.strengths.some((s) => s.includes('รสชาติ') || s.includes('บรรยากาศ'))).toBe(true);
    expect(profile.weaknesses.some((w) => w.includes('ช้า') || w.includes('แพง'))).toBe(true);
  });
});

describe('analyzeCompetitorProfile', () => {
  test('prefers review snippets over metadata heuristics', () => {
    const entry: CompetitorEntry = {
      name: 'Test Cafe',
      distanceMeters: 4000,
      zone: 'extended',
      threatLevel: 'low',
      reviewSnippets: [{ text: 'กาแฟอร่อยมาก บรรยากาศดี', rating: 5 }],
    };
    const profile = analyzeCompetitorProfile(entry);
    expect(profile.strengths.some((s) => s.includes('รสชาติ') || s.includes('บรรยากาศ'))).toBe(true);
  });

  test('flags high rating and missing facebook as strength/weakness', () => {
    const entry: CompetitorEntry = {
      name: 'Starbucks',
      distanceMeters: 400,
      zone: 'immediate',
      threatLevel: 'high',
      rating: 4.6,
      userRatingsTotal: 200,
    };
    const profile = analyzeCompetitorProfile(entry);
    expect(profile.strengths.some((s) => s.includes('4.6'))).toBe(true);
    expect(profile.weaknesses.some((w) => w.includes('Facebook'))).toBe(true);
  });
});

describe('buildCompetitorAnalysis own-store exclusion', () => {
  test('excludes own store from competitors and insights', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      {
        place_id: 'own',
        name: 'Black and brew.coffee',
        rating: 4.9,
        user_ratings_total: 80,
        geometry: { location: { lat: 13.9297, lng: 100.716933 } },
      },
      {
        place_id: 'other',
        name: 'Starbucks',
        rating: 4.5,
        user_ratings_total: 100,
        geometry: { location: { lat: 13.9305, lng: 100.716932 } },
      },
    ]);

    expect(analysis.totalCount).toBe(1);
    expect(analysis.competitors[0].name).toBe('Starbucks');
    expect(analysis.deterministicInsights[0]).not.toContain('กรองเฉพาะ segment');
    expect(analysis.deterministicInsights[0]).toContain('ในรัศมี 5 กม.');
  });

  test('maps facebook URL from website_uri', () => {
    const analysis = buildCompetitorAnalysis(STORE_LAT, STORE_LON, [
      {
        name: 'Starbucks',
        rating: 4.5,
        user_ratings_total: 100,
        website_uri: 'https://www.facebook.com/starbucks.th',
        geometry: { location: { lat: 13.9305, lng: 100.716932 } },
      },
    ]);

    expect(analysis.competitors[0].facebookUrl).toBe('https://www.facebook.com/starbucks.th');
    expect(analysis.competitors[0].strengths?.some((s) => s.includes('Facebook'))).toBe(true);
  });
});
