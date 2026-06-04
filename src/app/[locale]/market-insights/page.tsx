
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getMarketInsights } from '@/app/actions/market-insights-actions';
import { RefreshCw, Users, Coffee, Lightbulb, Sparkles, Database, CheckCircle2, AlertCircle, XCircle, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CachedInsights {
  data: any;
  timestamp: number;
}

export default function MarketInsightsPage() {
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load cached data on mount (no expiration)
  useEffect(() => {
    const loadFromCache = () => {
      const cached = localStorage.getItem('marketInsightsCache');
      if (cached) {
        try {
          const parsed: CachedInsights = JSON.parse(cached);
          setInsights(parsed.data);
          setLastUpdated(new Date(parsed.timestamp));
          setHasLoaded(true);
        } catch (e) {
          console.error('[MarketInsights] Failed to parse cached insights:', e);
        }
      }
    };

    loadFromCache();
  }, []);

  // Only load from cache (no API calls)
  const loadFromCacheOnly = () => {
    const cached = localStorage.getItem('marketInsightsCache');
    if (cached) {
      try {
        const parsed: CachedInsights = JSON.parse(cached);
        setInsights(parsed.data);
        setLastUpdated(new Date(parsed.timestamp));
        setHasLoaded(true);
      } catch (e) {
        console.error('[MarketInsights] Failed to parse cached insights:', e);
      }
    }
  };

  // Force refresh from APIs
  const loadFreshInsights = async () => {
    setIsLoading(true);
    try {
      // Load fresh data
      let salesData = null;
      if (typeof window !== 'undefined') {
        const cachedSales = localStorage.getItem('salesMetrics');
        if (cachedSales) {
          salesData = JSON.parse(cachedSales);
        }
      }
      const data = await getMarketInsights(salesData);
      
      // Cache the new insights
      if (data && typeof window !== 'undefined') {
        const cacheData: CachedInsights = {
          data: data,
          timestamp: Date.now(),
        };
        localStorage.setItem('marketInsightsCache', JSON.stringify(cacheData));
        setLastUpdated(new Date());
      }
      
      setInsights(data);
      setHasLoaded(true);
    } catch (error) {
      console.error('[MarketInsights] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Check if line starts with bullet point marker (-, •, etc.)
      const hasBullet = /^(\s*[-*•])/.test(line.trim());
      return (
        <motion.p
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`mb-3 leading-relaxed ${hasBullet ? 'pl-5 -indent-5' : ''}`}
        >
          {line}
        </motion.p>
      );
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] text-black antialiased font-normal">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 md:mb-14"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white border border-black/5 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-sm text-black/60 bg-black/5 px-3 py-1 rounded-full">
                  Market Intelligence
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl tracking-tight">
                ข้อมูลเชิงลึกตลาด
              </h1>
              <p className="text-black/60 text-base md:text-lg max-w-2xl">
                วิเคราะห์พฤติกรรมผู้บริโภค และกลยุทธ์เพื่อขับเคลื่อนธุรกิจของคุณ
              </p>
            </div>
            {/* Only show header buttons when we have data or loading */}
            {(hasLoaded || isLoading) && (
              <div className="flex flex-col md:flex-row items-end gap-3">
                {hasLoaded && (
                  <button
                    onClick={loadFromCacheOnly}
                    disabled={isLoading}
                    className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-xl hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">โหลดข้อมูลเดิม</span>
                  </button>
                )}
                <button
                  onClick={loadFreshInsights}
                  disabled={isLoading}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl hover:bg-black/80 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span>{hasLoaded ? 'วิเคราะห์ใหม่' : 'เริ่มวิเคราะห์'}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Initial State - No Data Loaded */}
        <AnimatePresence>
          {!hasLoaded && !isLoading && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-black/5 p-10 md:p-16 text-center"
            >
              <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-black/5 flex items-center justify-center">
                <Lightbulb className="w-10 h-10 text-black" />
              </div>
              <h2 className="text-2xl mb-3">พร้อมวิเคราะห์ตลาดแล้วหรือยัง?</h2>
              <p className="text-black/60 mb-8 max-w-md mx-auto">
                คลิกที่ปุ่มเพื่อเริ่มต้นวิเคราะห์ข้อมูลเชิงลึก ตามข้อมูลยอดขาย, ข้อมูลคลังสินค้า, สภาพอากาศ และเทรนด์ในพื้นที่ของคุณ
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                <button
                  onClick={loadFromCacheOnly}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-black/5 text-black rounded-xl hover:bg-black/5 transition-all duration-300 shadow-sm"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>โหลดข้อมูลเดิม</span>
                </button>
                <button
                  onClick={loadFreshInsights}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-2xl hover:bg-black/80 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>เริ่มต้นวิเคราะห์ใหม่</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-3xl border border-black/5 p-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/5 animate-pulse" />
                    <div className="h-6 w-48 bg-black/5 rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-black/5 rounded-lg animate-pulse" />
                    <div className="h-4 w-3/4 bg-black/5 rounded-lg animate-pulse" />
                    <div className="h-4 w-5/6 bg-black/5 rounded-lg animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {hasLoaded && !isLoading && !insights && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-black/5 rounded-3xl p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/5 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl mb-2">เกิดข้อผิดพลาด</h3>
              <p className="text-black/60 mb-6">ไม่สามารถโหลดข้อมูลวิเคราะห์ได้ในขณะนี้</p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                <button
                  onClick={loadFromCacheOnly}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-black/5 text-black rounded-xl hover:bg-black/5 transition-colors shadow-sm"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>โหลดข้อมูลเดิม</span>
                </button>
                <button
                  onClick={loadFreshInsights}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-black/80 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>ลองอีกครั้ง (ใหม่)</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insights Content */}
        <AnimatePresence>
          {hasLoaded && !isLoading && insights && (
            <div className="space-y-6 md:space-y-8">
              {/* Inventory & Validation Status Card */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="group"
              >
                <div className="bg-white rounded-3xl border border-black/5 hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                  <div className="flex items-start gap-5 mb-6">
                    <div className="p-4 bg-black/5 rounded-2xl">
                      <Database className="w-7 h-7 text-black" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl mb-1">
                        สถานะการเชื่อมต่อฐานข้อมูลคลังสินค้า
                      </h2>
                      <p className="text-black/40 text-sm">การตรวจสอบความถูกต้องและการซิงโครไนซ์ข้อมูล</p>
                    </div>
                  </div>

                  {insights.inventoryData && insights.validationReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-black/[0.02] rounded-2xl p-4 border border-black/5">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-black" />
                            <span className="text-xs text-black/60">รายการที่ถูกต้อง</span>
                          </div>
                          <div className="text-2xl">{insights.validationReport.validItems}</div>
                        </div>
                        
                        <div className="bg-black/[0.02] rounded-2xl p-4 border border-black/5">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-black" />
                            <span className="text-xs text-black/60">สินค้าต่ำกว่าจุดสั่งซื้อ</span>
                          </div>
                          <div className="text-2xl">{insights.validationReport.itemsWithLowStock}</div>
                        </div>
                        
                        <div className="bg-black/[0.02] rounded-2xl p-4 border border-black/5">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-5 h-5 text-black" />
                            <span className="text-xs text-black/60">รายการที่ไม่ถูกต้อง</span>
                          </div>
                          <div className="text-2xl">{insights.validationReport.invalidItems}</div>
                        </div>
                        
                        <div className="bg-black/[0.02] rounded-2xl p-4 border border-black/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-black" />
                            <span className="text-xs text-black/60">รายการทั้งหมด</span>
                          </div>
                          <div className="text-2xl">{insights.validationReport.totalItems}</div>
                        </div>
                      </div>

                      {insights.validationReport.validationErrors.length > 0 && (
                        <div className="bg-black/[0.02] border border-black/5 rounded-2xl p-4">
                          <h4 className="text-sm text-black mb-2">รายการที่มีปัญหา:</h4>
                          <ul className="space-y-1 text-sm text-black/60">
                            {insights.validationReport.validationErrors.slice(0, 5).map((err: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-black mt-1">•</span>
                                <span>{err}</span>
                              </li>
                            ))}
                            {insights.validationReport.validationErrors.length > 5 && (
                              <li className="text-xs text-black/40">
                                +{insights.validationReport.validationErrors.length - 5} รายการอื่นๆ
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <div className="text-xs text-black/40">
                        การซิงโครไนซ์ข้อมูลล่าสุด: {new Date(insights.inventoryData.lastSync).toLocaleString('th-TH')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-black/60 text-base">
                      ไม่สามารถเชื่อมต่อกับฐานข้อมูลคลังสินค้าได้ค่ะ
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Insights Cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6 md:space-y-8"
              >
                {/* Card 1: Consumer Behavior */}
                <motion.div variants={itemVariants} className="group">
                  <div className="bg-white rounded-3xl border border-black/5 hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="p-4 bg-black/5 rounded-2xl">
                        <Users className="w-7 h-7 text-black" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl mb-1">
                          พฤติกรรมผู้บริโภคในพื้นที่
                        </h2>
                        <p className="text-black/40 text-sm">การวิเคราะห์พฤติกรรมและแนวโน้ม</p>
                      </div>
                    </div>
                    <div className="text-black/60 text-base md:text-lg pl-2 border-l-4 border-black/10">
                      {formatContent(insights.behavior)}
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: Trends & Menu */}
                <motion.div variants={itemVariants} className="group">
                  <div className="bg-white rounded-3xl border border-black/5 hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="p-4 bg-black/5 rounded-2xl">
                        <Coffee className="w-7 h-7 text-black" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl mb-1">
                          กระแสเมนูและวัตถุดิบ
                        </h2>
                        <p className="text-black/40 text-sm">เทรนด์ยอดนิยมและความนิยม</p>
                      </div>
                    </div>
                    <div className="text-black/60 text-base md:text-lg pl-2 border-l-4 border-black/10">
                      {formatContent(insights.trends)}
                    </div>
                  </div>
                </motion.div>

                {/* Card 3: Strategy */}
                <motion.div variants={itemVariants} className="group">
                  <div className="bg-white rounded-3xl border border-black/5 hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="p-4 bg-black/5 rounded-2xl">
                        <Lightbulb className="w-7 h-7 text-black" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl mb-1">
                          แผนกลยุทธ์และโปรโมชั่น
                        </h2>
                        <p className="text-black/40 text-sm">ข้อเสนอแนะและแผนปฏิบัติการ</p>
                      </div>
                    </div>
                    <div className="text-black/60 text-base md:text-lg pl-2 border-l-4 border-black/10">
                      {formatContent(insights.strategy)}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer Section */}
        {hasLoaded && insights && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-black/40 text-sm">
              อัปเดตครั้งล่าสุด: {lastUpdated?.toLocaleString('th-TH')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
