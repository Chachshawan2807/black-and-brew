import type { CompetitorAnalysis } from './market-insights-types';
import {
  analyzeCompetitorProfile,
  extractFacebookUrl,
  type PlaceReviewSnippet,
} from './market-insights-competitor-profile';
import { IMPACT_RADIUS_M, type RawPlaceResult } from './market-insights-competitors';

/** Minimal field mask — Enterprise SKU fields only where needed for competitor analysis. */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.currentOpeningHours',
  'places.businessStatus',
  'places.websiteUri',
].join(',');

const PLACE_DETAILS_FIELD_MASK = 'websiteUri';
const PLACE_REVIEWS_FIELD_MASK = 'websiteUri,reviews';

export interface GooglePlacesNewPlace {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  businessStatus?: string;
  websiteUri?: string;
}

export interface GooglePlacesFetchResult {
  results: RawPlaceResult[];
  status: string;
  errorMessage?: string;
}

export function priceLevelFromGoogle(level?: string): number | undefined {
  switch (level) {
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1;
    case 'PRICE_LEVEL_MODERATE':
      return 2;
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4;
    default:
      return undefined;
  }
}

/** Map Places API (New) place → legacy RawPlaceResult shape used by analysis pipeline. */
export function mapGooglePlaceNewToRaw(place: GooglePlacesNewPlace): RawPlaceResult | null {
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (!name || lat == null || lng == null) return null;

  return {
    place_id: place.id,
    name,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    vicinity: place.formattedAddress,
    price_level: priceLevelFromGoogle(place.priceLevel),
    business_status: place.businessStatus,
    opening_hours: place.currentOpeningHours?.openNow != null
      ? { open_now: place.currentOpeningHours.openNow }
      : undefined,
    geometry: { location: { lat, lng } },
    website_uri: place.websiteUri,
  };
}

export function mapGooglePlacesNewResponse(places: GooglePlacesNewPlace[]): RawPlaceResult[] {
  return places
    .map(mapGooglePlaceNewToRaw)
    .filter((p): p is RawPlaceResult => p != null)
    .slice(0, 20);
}

/**
 * Nearby Search — Places API (New)
 * https://places.googleapis.com/v1/places:searchNearby
 */
export async function fetchGooglePlacesNew(
  lat: string,
  lon: string,
  apiKey: string
): Promise<GooglePlacesFetchResult> {
  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);

  const body = {
    includedTypes: ['cafe', 'coffee_shop'],
    maxResultCount: 20,
    languageCode: 'th',
    regionCode: 'TH',
    locationRestriction: {
      circle: {
        center: { latitude: latN, longitude: lonN },
        radius: IMPACT_RADIUS_M,
      },
    },
  };

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const err = (await res.json()) as { error?: { message?: string; status?: string } };
      errorMessage = err.error?.message ?? errorMessage;
      const status = err.error?.status ?? `HTTP_${res.status}`;
      console.error('[fetchGooglePlacesNew]', status, errorMessage);
      return { results: [], status, errorMessage };
    } catch {
      console.error('[fetchGooglePlacesNew] HTTP', res.status, res.statusText);
      return { results: [], status: 'HTTP_ERROR', errorMessage };
    }
  }

  const data = (await res.json()) as { places?: GooglePlacesNewPlace[] };
  const results = mapGooglePlacesNewResponse(data.places ?? []);
  const status = results.length > 0 ? 'OK' : 'ZERO_RESULTS';
  return { results, status };
}

function normalizePlaceResourceId(placeId: string): string {
  return placeId.startsWith('places/') ? placeId : `places/${placeId}`;
}

type GooglePlaceReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
};

function mapGoogleReviews(reviews?: GooglePlaceReview[]): PlaceReviewSnippet[] {
  if (!reviews?.length) return [];
  return reviews
    .map((review) => ({
      text: (review.originalText?.text ?? review.text?.text ?? '').trim(),
      rating: review.rating,
    }))
    .filter((review) => review.text.length > 0)
    .slice(0, 5);
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  fieldMask: string
): Promise<{ websiteUri?: string; reviews?: GooglePlaceReview[] } | null> {
  try {
    const resource = normalizePlaceResourceId(placeId);
    const res = await fetch(`https://places.googleapis.com/v1/${resource}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as { websiteUri?: string; reviews?: GooglePlaceReview[] };
  } catch (error) {
    console.error('[fetchPlaceDetails]', placeId, error);
    return null;
  }
}

/** Fetch websiteUri for places missing it from nearby search (Facebook fanpages often appear here). */
export async function enrichPlacesWithWebsiteUri(
  places: RawPlaceResult[],
  apiKey: string
): Promise<RawPlaceResult[]> {
  const missing = places.filter((p) => p.place_id && !p.website_uri);
  if (missing.length === 0) return places;

  const websiteByPlaceId = new Map<string, string>();

  await Promise.all(
    missing.map(async (place) => {
      const placeId = place.place_id;
      if (!placeId) return;

      const data = await fetchPlaceDetails(placeId, apiKey, PLACE_DETAILS_FIELD_MASK);
      if (data?.websiteUri?.trim()) {
        websiteByPlaceId.set(placeId, data.websiteUri.trim());
      }
    })
  );

  if (websiteByPlaceId.size === 0) return places;

  return places.map((place) => {
    if (!place.place_id || place.website_uri) return place;
    const website = websiteByPlaceId.get(place.place_id);
    return website ? { ...place, website_uri: website } : place;
  });
}

/** Fetch Google Maps reviews and rebuild SWOT from review text. */
export async function enrichCompetitorAnalysisWithReviews(
  analysis: CompetitorAnalysis,
  apiKey: string
): Promise<CompetitorAnalysis> {
  const competitors = await Promise.all(
    analysis.competitors.map(async (entry) => {
      if (!entry.placeId) return entry;

      const data = await fetchPlaceDetails(entry.placeId, apiKey, PLACE_REVIEWS_FIELD_MASK);
      if (!data) return entry;

      const fetchedReviews = mapGoogleReviews(data.reviews);
      const reviewSnippets = fetchedReviews.length > 0 ? fetchedReviews : entry.reviewSnippets;
      const websiteUrl = entry.websiteUrl ?? data.websiteUri?.trim();
      const facebookUrl = entry.facebookUrl ?? extractFacebookUrl(websiteUrl);

      const updated = {
        ...entry,
        websiteUrl,
        facebookUrl,
        reviewSnippets,
      };
      const profile = analyzeCompetitorProfile(updated);
      return {
        ...updated,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
      };
    })
  );

  return { ...analysis, competitors };
}

export function googlePlacesNewFailureMessage(status: string, errorMessage?: string): string {
  if (status === 'PERMISSION_DENIED' || status === 'REQUEST_DENIED') {
    return (
      'Google Places API (New) ปฏิเสธคำขอ — เปิดใช้ "Places API (New)" ใน Google Cloud Console ' +
      'และจำกัด API key ให้ตรงกับ Places API (New) พร้อมเปิด Billing'
    );
  }
  if (status === 'RESOURCE_EXHAUSTED' || status === 'OVER_QUERY_LIMIT') {
    return 'Google Places เกินโควต้า — ลองใหม่ภายหลังหรือตรวจ billing';
  }
  return `Google Places API (New): ${status}${errorMessage ? ` — ${errorMessage}` : ''}`;
}
