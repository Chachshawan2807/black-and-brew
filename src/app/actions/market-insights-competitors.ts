import type {
  CompetitorAnalysis,
  CompetitorDataSource,
  CompetitorEntry,
  CompetitorZone,
} from './market-insights-types';
import {
  SEGMENT_CRITERIA_LABEL,
  matchCompetitorSegment,
} from './market-insights-competitor-segment';
import {
  analyzeCompetitorProfile,
  extractFacebookUrl,
  isOwnStore,
} from './market-insights-competitor-profile';

/** Walk-in / direct competition (m). */
export const ZONE_IMMEDIATE_M = 500;
/** Same catchment area (m). */
export const ZONE_PRIMARY_M = 1500;
/** Indirect impact zone (m) — full trade area scan. */
export const IMPACT_RADIUS_M = 5000;

export interface RawPlaceResult {
  place_id?: string;
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  price_level?: number;
  business_status?: string;
  opening_hours?: { open_now?: boolean };
  geometry?: { location?: { lat?: number; lng?: number } };
  website_uri?: string;
  reviews?: Array<{ text: string; rating?: number }>;
}

/** Great-circle distance in metres between two WGS-84 points. */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function classifyZone(distanceMeters: number): CompetitorZone {
  if (distanceMeters <= ZONE_IMMEDIATE_M) return 'immediate';
  if (distanceMeters <= ZONE_PRIMARY_M) return 'primary';
  return 'extended';
}

export function computeThreatLevel(entry: {
  rating?: number;
  userRatingsTotal?: number;
  distanceMeters: number;
}): CompetitorEntry['threatLevel'] {
  const { rating = 0, userRatingsTotal = 0, distanceMeters } = entry;

  if (distanceMeters <= ZONE_IMMEDIATE_M) return 'high';
  if (distanceMeters <= 800 && rating >= 4 && userRatingsTotal >= 50) return 'high';
  if (distanceMeters <= ZONE_PRIMARY_M && rating >= 3.5) return 'medium';
  if (distanceMeters <= ZONE_PRIMARY_M) return 'medium';
  return 'low';
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} ม.`;
  return `${(meters / 1000).toFixed(1)} กม.`;
}

function densityLabel(
  immediate: number,
  total: number
): CompetitorAnalysis['densityLabel'] {
  if (immediate >= 3) return 'very_dense';
  if (immediate >= 2 || total >= 10) return 'dense';
  if (total >= 4) return 'moderate';
  return 'sparse';
}

const DENSITY_LABEL_TH: Record<CompetitorAnalysis['densityLabel'], string> = {
  sparse: 'คู่แข่งน้อย',
  moderate: 'คู่แข่งปานกลาง',
  dense: 'คู่แข่งหนาแน่น',
  very_dense: 'คู่แข่งหนาแน่นมาก',
};

const ZONE_LABEL_TH: Record<CompetitorZone, string> = {
  immediate: 'ใกล้มาก (≤500 ม.)',
  primary: 'พื้นที่หลัก (500 ม.–1.5 กม.)',
  extended: 'โซนกระทบ (1.5–5 กม.)',
};

function buildDeterministicInsights(
  byZone: CompetitorAnalysis['byZone'],
  topThreats: CompetitorEntry[],
  density: CompetitorAnalysis['densityLabel']
): string[] {
  const insights: string[] = [];

  const total = byZone.immediate + byZone.primary + byZone.extended;
  insights.push(
    `ในรัศมี ${IMPACT_RADIUS_M / 1000} กม. พบคู่แข่งที่เทียบเคียงได้ ${total} แห่ง — ${DENSITY_LABEL_TH[density]}`
  );

  if (byZone.immediate > 0) {
    insights.push(
      `โซนใกล้มาก (≤500 ม.) มี ${byZone.immediate} ร้าน — ลูกค้าเดินทางสั้นอาจเปรียบเทียบก่อนตัดสินใจ`
    );
  }

  if (topThreats[0]) {
    const t = topThreats[0];
    insights.push(
      `คู่แข่งที่ควรจับตา: ${t.name} (${formatDistance(t.distanceMeters)}${t.rating ? ` · ${t.rating}★` : ''})`
    );
  }

  if (byZone.extended > byZone.immediate + byZone.primary) {
    insights.push(
      `โซนกระทบไกล (1.5–5 กม.) มี ${byZone.extended} ร้าน — อาจดึงลูกค้าที่ขับรถหรือมาจากถนนหลัก`
    );
  }

  return insights.slice(0, 4);
}

type CompetitorAnalysisBase = Pick<
  CompetitorAnalysis,
  | 'storeLat'
  | 'storeLon'
  | 'dataSource'
  | 'impactRadiusMeters'
  | 'zoneLabels'
  | 'segmentCriteria'
  | 'scannedCount'
  | 'webContext'
  | 'placesApiMessage'
>;

function finalizeCompetitorAnalysis(
  base: CompetitorAnalysisBase,
  competitors: CompetitorEntry[],
  dataSource: CompetitorDataSource
): CompetitorAnalysis {
  const byZone = {
    immediate: competitors.filter((c) => c.zone === 'immediate').length,
    primary: competitors.filter((c) => c.zone === 'primary').length,
    extended: competitors.filter((c) => c.zone === 'extended').length,
  };

  const rated = competitors.filter((c) => c.rating != null);
  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length) * 10) / 10
      : null;

  const reviewed = competitors.filter((c) => (c.userRatingsTotal ?? 0) > 0);
  const avgReviewCount =
    reviewed.length > 0
      ? Math.round(reviewed.reduce((s, c) => s + (c.userRatingsTotal ?? 0), 0) / reviewed.length)
      : null;

  const density = densityLabel(byZone.immediate, competitors.length);
  const topThreats = [...competitors]
    .sort((a, b) => {
      const score = (c: CompetitorEntry) =>
        (c.rating ?? 3) * Math.log10((c.userRatingsTotal ?? 1) + 1) / (c.distanceMeters / 1000 + 0.1);
      return score(b) - score(a);
    })
    .slice(0, 5);

  const deterministicInsights = buildDeterministicInsights(byZone, topThreats, density);
  if (dataSource === 'openstreetmap' && competitors.length > 0) {
    deterministicInsights.push(
      'แหล่งข้อมูล: OpenStreetMap จากพิกัดร้าน (ฟรี) — ยังไม่มีคะแนนรีวิว · ใส่ GOOGLE_PLACES_API_KEY เพื่อข้อมูลละเอียดขึ้น'
    );
  }

  return {
    ...base,
    totalCount: competitors.length,
    byZone,
    avgRating,
    avgReviewCount,
    topThreats,
    densityLabel: density,
    deterministicInsights: deterministicInsights.slice(0, 5),
    competitors,
  };
}

/** Re-filter own store and refresh stats (e.g. stale cached payloads). */
export function sanitizeCompetitorAnalysis(analysis: CompetitorAnalysis): CompetitorAnalysis {
  const competitors = analysis.competitors
    .filter((c) => !isOwnStore(c.name, c.distanceMeters))
    .map((c) => {
      const profile = analyzeCompetitorProfile(c);
      return {
        ...c,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
      };
    });

  return finalizeCompetitorAnalysis(
    {
      storeLat: analysis.storeLat,
      storeLon: analysis.storeLon,
      dataSource: analysis.dataSource,
      impactRadiusMeters: analysis.impactRadiusMeters,
      zoneLabels: analysis.zoneLabels,
      segmentCriteria: analysis.segmentCriteria,
      scannedCount: analysis.scannedCount,
      webContext: analysis.webContext,
      placesApiMessage: analysis.placesApiMessage,
    },
    competitors,
    analysis.dataSource
  );
}

export function buildCompetitorAnalysis(
  storeLat: string,
  storeLon: string,
  rawPlaces: RawPlaceResult[],
  options?: { webContext?: string; dataSource?: CompetitorDataSource }
): CompetitorAnalysis {
  const { webContext, dataSource = 'openstreetmap' } = options ?? {};
  const lat0 = parseFloat(storeLat);
  const lon0 = parseFloat(storeLon);
  const scannedCount = rawPlaces.length;
  const segmentMatches = rawPlaces
    .map((r) => {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      const distanceMeters =
        lat != null && lng != null ? haversineMeters(lat0, lon0, lat, lng) : IMPACT_RADIUS_M;
      return { place: r, segment: matchCompetitorSegment(r), distanceMeters };
    })
    .filter(
      (x) =>
        x.segment.included && !isOwnStore(x.place.name ?? '', x.distanceMeters)
    );

  const competitors: CompetitorEntry[] = segmentMatches
    .map(({ place: r, segment, distanceMeters }) => {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      const websiteUrl = r.website_uri?.trim() || undefined;
      const facebookUrl = extractFacebookUrl(websiteUrl);

      const entry: CompetitorEntry = {
        placeId: r.place_id,
        name: r.name ?? 'ไม่ทราบชื่อ',
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        vicinity: r.vicinity,
        distanceMeters,
        zone: classifyZone(distanceMeters),
        priceLevel: r.price_level,
        openNow: r.opening_hours?.open_now,
        lat,
        lng,
        threatLevel: computeThreatLevel({
          rating: r.rating,
          userRatingsTotal: r.user_ratings_total,
          distanceMeters,
        }),
        mapsUrl:
          lat != null && lng != null
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : undefined,
        websiteUrl,
        facebookUrl,
        reviewSnippets: r.reviews,
        segmentLabel: segment.label,
      };

      const profile = analyzeCompetitorProfile(entry);
      entry.strengths = profile.strengths;
      entry.weaknesses = profile.weaknesses;
      return entry;
    })
    .filter((c) => c.name !== 'ไม่ทราบชื่อ' && c.distanceMeters <= IMPACT_RADIUS_M)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return finalizeCompetitorAnalysis(
    {
      storeLat,
      storeLon,
      dataSource,
      impactRadiusMeters: IMPACT_RADIUS_M,
      zoneLabels: ZONE_LABEL_TH,
      segmentCriteria: SEGMENT_CRITERIA_LABEL,
      scannedCount,
      webContext,
    },
    competitors,
    dataSource
  );
}

/** Compact string for the AI prompt — avoids repeating full competitor list. */
export function buildCompetitorPromptDigest(analysis: CompetitorAnalysis | null): string {
  if (!analysis || analysis.totalCount === 0) return 'N/A';

  const top = analysis.topThreats
    .slice(0, 4)
    .map(
      (c) =>
        `${c.name}@${formatDistance(c.distanceMeters)}(${c.zone},${c.threatLevel}${c.rating ? `,${c.rating}★` : ''})`
    )
    .join('; ');

  return [
    `count=${analysis.totalCount}`,
    `segment=${analysis.segmentCriteria}`,
    `zones=imm:${analysis.byZone.immediate}/pri:${analysis.byZone.primary}/ext:${analysis.byZone.extended}`,
    `density=${analysis.densityLabel}`,
    `avgRating=${analysis.avgRating ?? '-'}`,
    `topThreats=${top}`,
    analysis.webContext ? `web=${analysis.webContext.slice(0, 200)}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}
