'use client';

import React, { useState, useEffect } from 'react';
import { getMarketInsights } from '@/app/actions/market-insights-actions';
import {
  RefreshCw,
  Users,
  Coffee,
  Lightbulb,
  Sparkles,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { readCache, writeCache, isStale } from '@/lib/cache/client-cache';
import {
  MARKET_INSIGHTS_CACHE_KEY_V2,
  isMarketInsightsV2,
  type MarketInsightsV2,
  type InsightBullet,
} from '@/app/actions/market-insights-types';
import ContextPanel from './components/ContextPanel';
import AlertsCard from './components/AlertsCard';
import InsightCharts from './components/InsightCharts';
import ActionChecklist from './components/ActionChecklist';
import SourcesList from './components/SourcesList';
import DiffBanner from './components/DiffBanner';

const CACHE_TTL = 300_000;

const CONFIDENCE_STYLE: Record<InsightBullet['confidence'], string> = {
  high: 'bg-[#eef6ee] text-green-800/70',
  medium: 'bg-[#fff6e6] text-amber-700/80',
  low: 'bg-black/[0.04] text-black/50',
};

const CONFIDENCE_LABEL: Record<InsightBullet['confidence'], string> = {
  high: 'มั่นใจสูง',
  medium: 'ปานกลาง',
  low: 'เบื้องต้น',
};

function BulletList({ bullets }: { bullets: InsightBullet[] }) {
  return (
    <div className="space-y-3">
      {bullets.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="pl-4 border-l-2 border-black/8"
        >
          <div className="flex items-start gap-2">
            <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${CONFIDENCE_STYLE[b.confidence]}`}>
              {CONFIDENCE_LABEL[b.confidence]}
            </span>
            <p className="text-black/70 leading-relaxed">{b.text}</p>
          </div>
          {b.reason && <p className="text-xs text-black/40 mt-1 pl-1">เพราะ: {b.reason}</p>}
        </motion.div>
      ))}
    </div>
  );
}

export default function MarketInsightsPage() {
  const [insights, setInsights] = useState<MarketInsightsV2 | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [cacheIsStale, setCacheIsStale] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const { data, savedAt } = readCache<unknown>(MARKET_INSIGHTS_CACHE_KEY_V2);
    if (isMarketInsightsV2(data)) {
      setInsights(data);
      if (savedAt !== null) {
        setLastUpdated(new Date(savedAt));
        setCacheIsStale(isStale(savedAt, CACHE_TTL));
      }
      setHasLoaded(true);
    }
  }, [isMounted]);

  const loadFromCacheOnly = () => {
    const { data, savedAt } = readCache<unknown>(MARKET_INSIGHTS_CACHE_KEY_V2);
    if (isMarketInsightsV2(data)) {
      setInsights(data);
      if (savedAt !== null) {
        setLastUpdated(new Date(savedAt));
        setCacheIsStale(isStale(savedAt, CACHE_TTL));
      }
      setHasLoaded(true);
    }
  };

  const loadFreshInsights = async () => {
    setIsLoading(true);
    try {
      const data = await getMarketInsights(insights);
      if (data) {
        writeCache(MARKET_INSIGHTS_CACHE_KEY_V2, data, 'server');
        setLastUpdated(new Date());
        setCacheIsStale(false);
        setInsights(data);
      }
      setHasLoaded(true);
    } catch (error) {
      console.error('[MarketInsights] Error:', error);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const primaryButtonClass =
    'inline-flex items-center justify-center gap-1.5 md:gap-2 flex-1 md:flex-none min-w-0 px-3 py-2.5 md:px-6 md:py-3 text-[13px] md:text-base bg-black text-white rounded-3xl hover:bg-black/80 bb-transition bb-shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed';
  const actionButtonRowClass = 'flex flex-row items-stretch gap-2 w-full md:w-auto md:gap-3';

  return (
    <div className="min-h-screen bg-transparent text-black antialiased font-normal">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 md:mb-10"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white border border-black/5 rounded-2xl bb-shadow-sm">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-sm text-black/60 bg-black/5 px-3 py-1 rounded-full">
                  Market Intelligence
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl lg:text-5xl tracking-tight">ข้อมูลเชิงลึกตลาด</h1>
                {cacheIsStale && hasLoaded && (
                  <span className="text-xs text-black/40 bg-black/5 px-2 py-0.5 rounded-full border border-black/10">
                    ข้อมูลเก่า
                  </span>
                )}
              </div>
              <p className="text-black/60 text-base md:text-lg max-w-2xl">
                ศูนย์วิเคราะห์ตลาด — ประกอบยอดขาย คลังสินค้า อากาศ วันหยุด คู่แข่ง และเทรนด์ภายนอก เป็นแผนที่ลงมือทำได้จริง
              </p>
            </div>
            {(hasLoaded || isLoading) && (
              <div className={`${actionButtonRowClass} md:items-end`}>
                {hasLoaded && (
                  <button onClick={loadFromCacheOnly} disabled={isLoading} className={primaryButtonClass}>
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    <span>โหลดข้อมูลเดิม</span>
                  </button>
                )}
                <button onClick={loadFreshInsights} disabled={isLoading} className={`group ${primaryButtonClass}`}>
                  <RefreshCw className={`w-4 h-4 shrink-0 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span>{hasLoaded ? 'วิเคราะห์ใหม่' : 'เริ่มวิเคราะห์'}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Initial */}
        <AnimatePresence>
          {!hasLoaded && !isLoading && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-black/5 bb-shadow-sm p-10 md:p-16 text-center"
            >
              <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-black/5 flex items-center justify-center">
                <Lightbulb className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl mb-3">พร้อมวิเคราะห์ตลาดแล้วหรือยัง?</h2>
              <p className="text-black/60 mb-8 max-w-md mx-auto">
                AI จะรวมยอดขาย คลังสินค้า อากาศ วันหยุด คู่แข่งรอบร้าน และเทรนด์ภายนอก มาวิเคราะห์เชิงลึกพร้อมแผนปฏิบัติ
              </p>
              <div className={`${actionButtonRowClass} max-w-md mx-auto`}>
                <button onClick={loadFromCacheOnly} className={primaryButtonClass}>
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>โหลดข้อมูลเดิม</span>
                </button>
                <button onClick={loadFreshInsights} className={primaryButtonClass}>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>เริ่มต้นวิเคราะห์</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bb-card p-5 h-24 animate-pulse bg-black/[0.02]" />
                ))}
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bb-card p-8">
                  <div className="h-6 w-48 bg-black/5 rounded-lg animate-pulse mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-black/5 rounded-lg animate-pulse" />
                    <div className="h-4 w-3/4 bg-black/5 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {hasLoaded && !isLoading && !insights?.context && (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-black/5 rounded-3xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/5 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl mb-2">เกิดข้อผิดพลาด</h3>
              <p className="text-black/60 mb-6">ไม่สามารถโหลดข้อมูลวิเคราะห์ได้ในขณะนี้</p>
              <div className={`${actionButtonRowClass} max-w-md mx-auto`}>
                <button onClick={loadFreshInsights} className={primaryButtonClass}>
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>ลองอีกครั้ง</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence>
          {hasLoaded && !isLoading && insights?.context && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 md:space-y-8">
              {insights.diff && <DiffBanner diff={insights.diff} />}

              <ContextPanel context={insights.context} />

              {insights.context.alerts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-black/70">
                    <ShieldAlert className="w-5 h-5" />
                    <h2 className="text-lg md:text-xl">สิ่งที่ต้องระวัง</h2>
                  </div>
                  <AlertsCard alerts={insights.context.alerts} />
                </section>
              )}

              <InsightCharts snapshot={insights.context.salesSnapshot} />

              {/* AI narrative */}
              <div className="space-y-6">
                <div className="bb-card p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-black/[0.04] rounded-2xl bb-shadow-sm">
                      <Users className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl mb-0.5">พฤติกรรมผู้บริโภคในพื้นที่</h2>
                      <p className="text-black/40 text-sm">Insight จาก AI ไม่ใช่สรุปตัวเลขดิบ</p>
                    </div>
                  </div>
                  <BulletList bullets={insights.insights.behavior} />
                </div>

                <div className="bb-card p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-black/[0.04] rounded-2xl bb-shadow-sm">
                      <Coffee className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl mb-0.5">กระแสเมนูและวัตถุดิบ</h2>
                      <p className="text-black/40 text-sm">จับคู่เทรนด์ภายนอกกับจุดแข็งร้าน</p>
                    </div>
                  </div>
                  <BulletList bullets={insights.insights.trends} />
                </div>

                <div className="bb-card p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="p-3 bg-black/[0.04] rounded-2xl bb-shadow-sm">
                      <Lightbulb className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl mb-0.5">แผนกลยุทธ์และโปรโมชั่น</h2>
                      <p className="text-black/40 text-sm">มุมมองเชิงกลยุทธ์</p>
                    </div>
                  </div>
                  <BulletList bullets={insights.insights.strategy} />
                </div>
              </div>

              {/* Action checklist */}
              {insights.actions.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-black/70">
                    <TrendingUp className="w-5 h-5" />
                    <h2 className="text-lg md:text-xl">แผนปฏิบัติสัปดาห์นี้</h2>
                  </div>
                  <ActionChecklist actions={insights.actions} />
                </section>
              )}

              <SourcesList sources={insights.sources} />

              <div className="text-center pt-4">
                <p className="text-black/40 text-sm">
                  อัปเดตครั้งล่าสุด: {lastUpdated?.toLocaleString('th-TH')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
