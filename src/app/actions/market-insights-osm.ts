import { IMPACT_RADIUS_M, type RawPlaceResult } from './market-insights-competitors';

export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Map Overpass OSM elements → shared RawPlaceResult shape. */
export function mapOsmElementsToRawPlaces(elements: OsmElement[]): RawPlaceResult[] {
  const seen = new Set<string>();

  return elements.flatMap((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const name = el.tags?.name?.trim();
    if (!name || lat == null || lng == null) return [];

    const key = `${name.toLowerCase()}@${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) return [];
    seen.add(key);

    const vicinity =
      el.tags?.['addr:street'] ||
      el.tags?.['addr:suburb'] ||
      el.tags?.['addr:city'] ||
      undefined;

    return [
      {
        place_id: `osm-${el.type}-${el.id}`,
        name,
        vicinity,
        geometry: { location: { lat, lng } },
      } satisfies RawPlaceResult,
    ];
  });
}

/**
 * Free fallback: nearby cafés from OpenStreetMap via Overpass API.
 * Uses store LAT/LON only — no API key required.
 */
export async function fetchOsmCompetitors(lat: string, lon: string): Promise<RawPlaceResult[]> {
  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);
  if (Number.isNaN(latN) || Number.isNaN(lonN)) return [];

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"cafe|coffee_shop"](around:${IMPACT_RADIUS_M},${latN},${lonN});
      node["shop"="coffee"](around:${IMPACT_RADIUS_M},${latN},${lonN});
      way["amenity"~"cafe|coffee_shop"](around:${IMPACT_RADIUS_M},${latN},${lonN});
      way["shop"="coffee"](around:${IMPACT_RADIUS_M},${latN},${lonN});
    );
    out center 50;
  `
    .replace(/\s+/g, ' ')
    .trim();

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error('[fetchOsmCompetitors] HTTP', res.status, res.statusText);
      return [];
    }

    const data = (await res.json()) as { elements?: OsmElement[] };
    return mapOsmElementsToRawPlaces(data.elements ?? []).slice(0, 40);
  } catch (error) {
    console.error('[fetchOsmCompetitors] Error:', error);
    return [];
  }
}
