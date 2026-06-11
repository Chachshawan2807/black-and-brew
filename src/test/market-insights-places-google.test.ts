import { describe, expect, test } from 'vitest';
import {
  mapGooglePlaceNewToRaw,
  mapGooglePlacesNewResponse,
  priceLevelFromGoogle,
} from '@/app/actions/market-insights-places-google';

describe('mapGooglePlaceNewToRaw', () => {
  test('maps Places API (New) fields to RawPlaceResult', () => {
    const raw = mapGooglePlaceNewToRaw({
      id: 'places/ChIJtest',
      displayName: { text: 'Starbucks' },
      formattedAddress: 'ลำลูกกา',
      location: { latitude: 13.93, longitude: 100.717 },
      rating: 4.5,
      userRatingCount: 120,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      currentOpeningHours: { openNow: true },
    });

    expect(raw).toMatchObject({
      place_id: 'places/ChIJtest',
      name: 'Starbucks',
      rating: 4.5,
      user_ratings_total: 120,
      vicinity: 'ลำลูกกา',
      price_level: 2,
      opening_hours: { open_now: true },
      geometry: { location: { lat: 13.93, lng: 100.717 } },
    });
  });

  test('returns null when name or coordinates missing', () => {
    expect(mapGooglePlaceNewToRaw({ id: 'x' })).toBeNull();
  });
});

describe('mapGooglePlacesNewResponse', () => {
  test('filters invalid entries', () => {
    const list = mapGooglePlacesNewResponse([
      { displayName: { text: 'Café Amazon' }, location: { latitude: 13.93, longitude: 100.717 } },
      { displayName: { text: 'No coords' } },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Café Amazon');
  });
});

describe('priceLevelFromGoogle', () => {
  test('maps enum to legacy 1-4 scale', () => {
    expect(priceLevelFromGoogle('PRICE_LEVEL_INEXPENSIVE')).toBe(1);
    expect(priceLevelFromGoogle('PRICE_LEVEL_VERY_EXPENSIVE')).toBe(4);
    expect(priceLevelFromGoogle('PRICE_LEVEL_UNSPECIFIED')).toBeUndefined();
  });
});
