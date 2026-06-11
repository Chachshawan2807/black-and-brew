'use server';

import type { CompetitorAnalysis, CompetitorDataSource } from './market-insights-types';
import { buildCompetitorAnalysis, type RawPlaceResult } from './market-insights-competitors';
import { fetchOsmCompetitors } from './market-insights-osm';
import { fetchCompetitorWebContext } from './market-insights-fetch';
import {
  enrichCompetitorAnalysisWithReviews,
  enrichPlacesWithWebsiteUri,
  fetchGooglePlacesNew,
  googlePlacesNewFailureMessage,
} from './market-insights-places-google';

/**
 * Nearby competitor cafés.
 *
 * 1. GOOGLE_PLACES_API_KEY → Places API (New) searchNearby
 * 2. Fallback OSM when no key or Google returns empty
 */
export async function fetchCompetitorAnalysis(
  lat: string,
  lon: string
): Promise<CompetitorAnalysis | null> {
  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);
  if (Number.isNaN(latN) || Number.isNaN(lonN)) {
    console.error('[fetchCompetitorAnalysis] Invalid store coordinates:', lat, lon);
    return null;
  }

  try {
    let rawPlaces: RawPlaceResult[] = [];
    let dataSource: CompetitorDataSource = 'openstreetmap';
    let placesApiMessage: string | undefined;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

    if (apiKey) {
      const google = await fetchGooglePlacesNew(lat, lon, apiKey);

      if (google.results.length > 0) {
        rawPlaces = await enrichPlacesWithWebsiteUri(google.results, apiKey);
        dataSource = 'google_places';
      } else if (google.status === 'OK' || google.status === 'ZERO_RESULTS') {
        dataSource = 'google_places';
        placesApiMessage =
          google.status === 'ZERO_RESULTS'
            ? 'Google Places ไม่พบร้านในรัศมี — ลอง OpenStreetMap เป็นข้อมูลสำรอง'
            : undefined;
        const osm = await fetchOsmCompetitors(lat, lon);
        if (osm.length > 0) {
          rawPlaces = osm;
          dataSource = 'openstreetmap';
        }
      } else {
        placesApiMessage = googlePlacesNewFailureMessage(google.status, google.errorMessage);
        dataSource = 'google_places';
        const osm = await fetchOsmCompetitors(lat, lon);
        if (osm.length > 0) {
          rawPlaces = osm;
          dataSource = 'openstreetmap';
          placesApiMessage += ' · แสดงข้อมูลสำรองจาก OpenStreetMap';
        }
      }
    } else {
      rawPlaces = await fetchOsmCompetitors(lat, lon);
      dataSource = 'openstreetmap';
    }

    const webContext = await fetchCompetitorWebContext();

    let analysis = buildCompetitorAnalysis(lat, lon, rawPlaces, {
      webContext: webContext || undefined,
      dataSource,
    });

    if (apiKey && dataSource === 'google_places' && analysis.competitors.length > 0) {
      analysis = await enrichCompetitorAnalysisWithReviews(analysis, apiKey);
    }

    return placesApiMessage ? { ...analysis, placesApiMessage } : analysis;
  } catch (error) {
    console.error('[fetchCompetitorAnalysis] Error:', error);
    return null;
  }
}

/** @deprecated use fetchCompetitorAnalysis */
export async function fetchNearbyCompetitors(lat: string, lon: string) {
  const analysis = await fetchCompetitorAnalysis(lat, lon);
  return analysis?.competitors ?? [];
}
