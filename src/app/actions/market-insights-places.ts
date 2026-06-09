import type { CompetitorEntry } from './market-insights-types';

/**
 * Google Places — nearby competitor cafés (OPTIONAL).
 *
 * Fully optional: when `GOOGLE_PLACES_API_KEY` is absent, returns [] and the
 * rest of Market Insights works unchanged. Never throws to the caller.
 */
export async function fetchNearbyCompetitors(
  lat: string,
  lon: string
): Promise<CompetitorEntry[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lon}&radius=2000&type=cafe&keyword=coffee&language=th&key=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error('[fetchNearbyCompetitors] HTTP', res.status, res.statusText);
      return [];
    }

    const data = (await res.json()) as {
      status?: string;
      results?: Array<{
        name?: string;
        rating?: number;
        user_ratings_total?: number;
        vicinity?: string;
      }>;
    };

    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[fetchNearbyCompetitors] Places status:', data.status);
      return [];
    }

    return (data.results ?? [])
      .slice(0, 8)
      .map((r) => ({
        name: r.name ?? 'ไม่ทราบชื่อ',
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        vicinity: r.vicinity,
      }))
      .filter((c) => c.name !== 'ไม่ทราบชื่อ');
  } catch (error) {
    console.error('[fetchNearbyCompetitors] Error:', error);
    return [];
  }
}
