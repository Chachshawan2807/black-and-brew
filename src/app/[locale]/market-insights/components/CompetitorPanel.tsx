'use client';

import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Target,
  Link2,
} from 'lucide-react';
import type { CompetitorAnalysis, CompetitorEntry, CompetitorZone } from '@/app/actions/market-insights-types';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { formatDistance, sanitizeCompetitorAnalysis } from '@/app/actions/market-insights-competitors';
import MetricInfoTip from './MetricInfoTip';

const DENSITY_LABEL: Record<CompetitorAnalysis['densityLabel'], string> = {
  sparse: 'คู่แข่งน้อย',
  moderate: 'ปานกลาง',
  dense: 'หนาแน่น',
  very_dense: 'หนาแน่นมาก',
};

const ZONE_STYLE: Record<CompetitorZone, string> = {
  immediate: 'bb-pastel-surface bg-[#fdeaea] text-red-800/80 border-red-100',
  primary: 'bb-pastel-surface bg-[#fff6e6] text-amber-800/80 border-amber-100',
  extended: 'bb-pastel-surface bg-[#e9f1fb] text-blue-800/70 border-blue-100',
};

const THREAT_STYLE: Record<CompetitorEntry['threatLevel'], string> = {
  high: 'bb-pastel-surface bg-[#fdeaea] text-red-700',
  medium: 'bb-pastel-surface bg-[#fff6e6] text-amber-700',
  low: 'bg-muted text-muted-foreground border border-border',
};

const THREAT_LABEL: Record<CompetitorEntry['threatLevel'], string> = {
  high: 'สูง',
  medium: 'กลาง',
  low: 'ต่ำ',
};

const PRICE_LABEL = ['', '฿', '฿฿', '฿฿฿', '฿฿฿฿'];

const DATA_SOURCE_LABEL = {
  google_places: 'Google Places (New)',
  openstreetmap: 'OpenStreetMap (พิกัดร้าน)',
} as const;

const CARD =
  'rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(0,0,0,0.03)]';

function ZoneBadge({ zone, labels }: { zone: CompetitorZone; labels: Record<CompetitorZone, string> }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ZONE_STYLE[zone]}`}>
      {labels[zone]}
    </span>
  );
}

function CompetitorRow({ entry, zoneLabels }: { entry: CompetitorEntry; zoneLabels: Record<CompetitorZone, string> }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-foreground font-medium truncate">{entry.name}</span>
          <ZoneBadge zone={entry.zone} labels={zoneLabels} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${THREAT_STYLE[entry.threatLevel]}`}>
            ภัย{THREAT_LABEL[entry.threatLevel]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {formatDistance(entry.distanceMeters)}
          </span>
          {entry.rating != null && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {entry.rating}
              {entry.userRatingsTotal ? ` (${entry.userRatingsTotal})` : ''}
            </span>
          )}
          {entry.priceLevel != null && entry.priceLevel > 0 && (
            <span>{PRICE_LABEL[entry.priceLevel]}</span>
          )}
          {entry.openNow != null && (
            <span className={entry.openNow ? 'text-green-600' : 'text-muted-foreground/80'}>
              {entry.openNow ? 'เปิดอยู่' : 'ปิดอยู่'}
            </span>
          )}
          {entry.segmentLabel && (
            <span className="text-[10px] bb-pastel-surface bg-[#eef6ee] text-black/70 px-1.5 py-0.5 rounded-full border border-[#c3e6cb]">
              {entry.segmentLabel}
            </span>
          )}
          {entry.vicinity && <span className="truncate max-w-[180px]">{entry.vicinity}</span>}
          {entry.facebookUrl && (
            <a
              href={entry.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600/80 hover:text-blue-700 bb-transition"
            >
              <Link2 className="w-3 h-3" />
              Facebook
            </a>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {entry.facebookUrl && (
          <HintTooltip tip="เปิด Facebook">
            <a
              href={entry.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-muted text-blue-600/70 hover:text-blue-700 bb-transition"
              aria-label={`เปิด Facebook ของ ${entry.name}`}
            >
              <Link2 className="w-4 h-4" />
            </a>
          </HintTooltip>
        )}
        {entry.mapsUrl && (
          <HintTooltip tip="เปิดใน Google Maps">
            <a
              href={entry.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground/80 hover:text-foreground/70 bb-transition"
              aria-label={`เปิด ${entry.name} ใน Google Maps`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </HintTooltip>
        )}
      </div>
    </div>
  );
}

function CompetitorProfileCard({ entry }: { entry: CompetitorEntry }) {
  const strengths = entry.strengths ?? [];
  const weaknesses = entry.weaknesses ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{entry.name}</span>
        <span className="text-xs text-muted-foreground/90">{formatDistance(entry.distanceMeters)}</span>
        {entry.rating != null && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {entry.rating}
          </span>
        )}
      </div>
      {entry.facebookUrl && (
        <a
          href={entry.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600/80 hover:text-blue-700 bb-transition break-all"
        >
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          {entry.facebookUrl}
        </a>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#3d6b3d]/70 mb-1">จุดเด่น</p>
          <ul className="space-y-0.5">
            {strengths.map((s, i) => (
              <li key={i} className="text-xs text-foreground/65 leading-relaxed">
                + {s}
              </li>
            ))}
            {strengths.length === 0 && <li className="text-xs text-muted-foreground/70">—</li>}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-amber-800/60 mb-1">จุดด้อย</p>
          <ul className="space-y-0.5">
            {weaknesses.map((w, i) => (
              <li key={i} className="text-xs text-foreground/65 leading-relaxed">
                − {w}
              </li>
            ))}
            {weaknesses.length === 0 && <li className="text-xs text-muted-foreground/70">—</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StoreLocationFallback({ analysis }: { analysis: CompetitorAnalysis }) {
  const storeMapsUrl = `https://www.google.com/maps/search/?api=1&query=${analysis.storeLat},${analysis.storeLon}`;
  const isOsm = analysis.dataSource === 'openstreetmap';

  return (
    <div className={`${CARD} p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-muted rounded-xl">
          <Target className="w-5 h-5 text-foreground" />
        </div>
        <div className="space-y-2 min-w-0">
          <h2 className="text-sm md:text-base flex items-center gap-1.5 flex-wrap tracking-tight">
            วิเคราะห์คู่แข่งรอบร้าน
            <MetricInfoTip id="competitor_analysis" />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border font-normal">
              {DATA_SOURCE_LABEL[analysis.dataSource]}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            พิกัดร้าน: {analysis.storeLat}, {analysis.storeLon} · รัศมี {analysis.impactRadiusMeters / 1000} กม.
          </p>
          <p className="text-xs text-muted-foreground/90">{analysis.segmentCriteria}</p>
          {analysis.placesApiMessage && (
            <p className="text-sm text-amber-800/90 bb-pastel-surface bg-[#fff6e6] border border-[#ffeeba] rounded-xl px-3 py-2 leading-relaxed">
              {analysis.placesApiMessage}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {analysis.scannedCount > 0
              ? `สแกน ${analysis.scannedCount} จุดในรัศมี ${analysis.impactRadiusMeters / 1000} กม. แต่ไม่มีร้านที่ผ่านเกณฑ์ segment (ไม่รวมตลาดล่าง)`
              : analysis.placesApiMessage
                ? 'แก้ไขการตั้งค่า Google Cloud แล้วกดวิเคราะห์ใหม่'
                : isOsm
                  ? 'ยังไม่พบร้านคาเฟ่ใน OpenStreetMap บริเวณนี้ — ลองกดวิเคราะห์ใหม่'
                  : 'ไม่พบคู่แข่งในรัศมีที่กำหนด'}
          </p>
          <a
            href={storeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 bb-transition"
          >
            ดูพื้นที่รอบร้านบนแผนที่
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CompetitorPanel({ analysis }: { analysis: CompetitorAnalysis | null }) {
  const [expanded, setExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  const safeAnalysis = useMemo(
    () => (analysis ? sanitizeCompetitorAnalysis(analysis) : null),
    [analysis]
  );

  if (!safeAnalysis) {
    return (
      <div className={`${CARD} p-4 md:p-5`}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-xl">
            <Target className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-sm md:text-base mb-1 flex items-center gap-1.5 tracking-tight">
              วิเคราะห์คู่แข่งรอบร้าน
              <MetricInfoTip id="competitor_analysis" />
            </h2>
            <p className="text-sm text-muted-foreground">
              ตั้งค่าพิกัดร้าน NEXT_PUBLIC_STORE_LAT และ NEXT_PUBLIC_STORE_LON ใน .env.local
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (safeAnalysis.totalCount === 0) {
    return <StoreLocationFallback analysis={safeAnalysis} />;
  }

  const { byZone, zoneLabels, topThreats, deterministicInsights } = safeAnalysis;
  const visibleList = expanded ? safeAnalysis.competitors : safeAnalysis.competitors.slice(0, 6);
  const storeMapsUrl = `https://www.google.com/maps/search/?api=1&query=${safeAnalysis.storeLat},${safeAnalysis.storeLon}`;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5 text-foreground/65 flex-wrap">
        <Target className="w-4 h-4" />
        <h2 className="text-base md:text-lg tracking-tight">วิเคราะห์คู่แข่งรอบร้าน</h2>
        <MetricInfoTip id="competitor_analysis" />
        <MetricInfoTip id="competitor_segment" />
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          รัศมี {safeAnalysis.impactRadiusMeters / 1000} กม.
        </span>
        <span className="text-xs text-muted-foreground bb-pastel-surface bg-[#eef6ee] px-2 py-0.5 rounded-full border border-[#c3e6cb]">
          {DATA_SOURCE_LABEL[safeAnalysis.dataSource]}
        </span>
      </div>
      {safeAnalysis.placesApiMessage && (
        <p className="text-sm text-amber-800/90 bb-pastel-surface bg-[#fff6e6] border border-[#ffeeba] rounded-xl px-3 py-2 leading-relaxed -mt-1">
          {safeAnalysis.placesApiMessage}
        </p>
      )}
      <p className="text-xs text-muted-foreground/90 -mt-2">
        {safeAnalysis.segmentCriteria}
        {safeAnalysis.scannedCount > safeAnalysis.totalCount && (
          <span className="text-muted-foreground/70">
            {' '}
            · กรองจาก {safeAnalysis.scannedCount} จุด → เหลือ {safeAnalysis.totalCount} ร้าน
          </span>
        )}
      </p>

      {/* Zone summary */}
      <div className="flex w-full flex-col gap-2.5 sm:grid sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            คู่แข่งทั้งหมด
            <MetricInfoTip id="competitor_density" />
          </div>
          <div className="text-2xl text-foreground tabular-nums">{safeAnalysis.totalCount}</div>
          <div className="text-xs text-muted-foreground/80 mt-1">{DENSITY_LABEL[safeAnalysis.densityLabel]}</div>
        </div>
        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            โซนใกล้มาก
            <MetricInfoTip id="competitor_zones" />
          </div>
          <div className="text-2xl text-foreground tabular-nums">{byZone.immediate}</div>
          <div className="text-xs text-muted-foreground/80 mt-1">≤500 ม.</div>
        </div>
        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            โซนหลัก
            <MetricInfoTip id="competitor_zones" />
          </div>
          <div className="text-2xl text-foreground tabular-nums">{byZone.primary}</div>
          <div className="text-xs text-muted-foreground/80 mt-1">500 ม.–1.5 กม.</div>
        </div>
        <div className={`${CARD} p-3.5`}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            คะแนนเฉลี่ย
            <MetricInfoTip id="competitor_avg_rating" />
          </div>
          <div className="text-2xl text-foreground flex items-center gap-1">
            {safeAnalysis.avgRating ?? '—'}
            {safeAnalysis.avgRating != null && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            {safeAnalysis.avgReviewCount != null ? `~${safeAnalysis.avgReviewCount} รีวิว/ร้าน` : 'ไม่มีรีวิว'}
          </div>
        </div>
      </div>

      {/* Deterministic insights (no AI cost) */}
      {deterministicInsights.length > 0 && (
        <div className={`${CARD} p-3.5 md:p-4`}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2.5">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs md:text-sm">สรุปจากพิกัดและข้อมูล Google Places</span>
          </div>
          <ul className="space-y-2">
            {deterministicInsights.map((line, i) => (
              <li key={i} className="text-sm text-foreground/70 pl-4 border-l-2 border-border leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
          {safeAnalysis.webContext && (
            <p className="text-xs text-muted-foreground/80 mt-3 pt-3 border-t border-border">
              จากเว็บ: {safeAnalysis.webContext}
            </p>
          )}
        </div>
      )}

      <div className={`${CARD} p-3.5 md:p-4`}>
        <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
          <span className="text-xs md:text-sm text-muted-foreground">
            วิเคราะห์จุดเด่น · จุดด้อยจากรีวิว ({safeAnalysis.competitors.length} ร้าน)
          </span>
          {safeAnalysis.competitors.length > 3 && (
            <button
              type="button"
              onClick={() => setProfileExpanded((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground/70 flex items-center gap-1 bb-transition"
            >
              {profileExpanded ? (
                <>
                  แสดงน้อยลง <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  ดูทั้งหมด <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {(profileExpanded ? safeAnalysis.competitors : safeAnalysis.competitors.slice(0, 3)).map((entry) => (
            <CompetitorProfileCard key={entry.placeId ?? `${entry.name}-${entry.distanceMeters}`} entry={entry} />
          ))}
        </div>
      </div>

      {/* Top threats */}
      {topThreats.length > 0 && (
        <div className={`${CARD} p-3.5 md:p-4`}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs md:text-sm">คู่แข่งที่ควรจับตา (เรียงตามความเสี่ยง)</span>
            <MetricInfoTip id="competitor_threat" />
          </div>
          <div className="flex flex-wrap gap-2">
            {topThreats.slice(0, 5).map((c) => (
              <span
                key={c.placeId ?? c.name}
                className="text-xs bg-muted text-foreground/70 px-3 py-1.5 rounded-full border border-border"
              >
                {c.name} · {formatDistance(c.distanceMeters)}
                {c.rating ? ` · ${c.rating}★` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full list */}
      <div className={`${CARD} p-3.5 md:p-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">รายการคู่แข่งตามระยะทาง</span>
          <a
            href={storeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground/70 flex items-center gap-1 bb-transition"
          >
            ดูแผนที่ร้านเรา
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div>
          {visibleList.map((entry) => (
            <CompetitorRow key={entry.placeId ?? `${entry.name}-${entry.distanceMeters}`} entry={entry} zoneLabels={zoneLabels} />
          ))}
        </div>
        {safeAnalysis.competitors.length > 6 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground/70 py-2 bb-transition"
          >
            {expanded ? (
              <>
                แสดงน้อยลง <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                ดูทั้งหมด {safeAnalysis.competitors.length} ร้าน <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
