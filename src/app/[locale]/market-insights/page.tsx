'use client';

import React, { useState } from 'react';
import { getMarketInsights } from '@/app/actions/market-insights-actions';
import { RefreshCw, Users, Coffee, Lightbulb, Sparkles, Database, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MarketInsightsPage() {
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      let salesData = null;
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('salesMetrics');
        if (cached) {
          salesData = JSON.parse(cached);
        }
      }
      const data = await getMarketInsights(salesData);
      setInsights(data);
      setHasLoaded(true);
    } catch (error) {
      console.error('[MarketInsights] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, index) => (
      <motion.p
        key={index}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="mb-3 leading-relaxed"
      >
        {line}
      </motion.p>
    ));
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
    <div className="min-h-screen bg-[#FAF8F5] text-slate-700 antialiased">
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
                <div className="p-3 bg-[#F5E6D3] rounded-2xl">
                  <Sparkles className="w-6 h-6 text-[#9B7B5C]" />
                </div>
                <span className="text-sm font-medium text-[#7A6652] bg-[#F5E6D3] px-3 py-1 rounded-full">
                  Market Intelligence
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-800 tracking-tight">
                ข้อมูลเชิงลึกตลาด
              </h1>
              <p className="text-slate-500 text-base md:text-lg max-w-2xl">
                ค้นพบเทรนด์ การวิเคราะห์พฤติกรรมผู้บริโภค และกลยุทธ์เพื่อขับเคลื่อนธุรกิจของคุณ
              </p>
            </div>
            <button
              onClick={loadInsights}
              disabled={isLoading}
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-[#4A4541] text-white rounded-2xl hover:bg-[#5B5551] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="font-medium">{hasLoaded ? 'รีเฟรชข้อมูล' : 'เริ่มวิเคราะห์'}</span>
            </button>
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
              className="bg-white rounded-3xl border border-[#E8E2DB] p-10 md:p-16 text-center"
            >
              <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-[#E6EEF6] flex items-center justify-center">
                <Lightbulb className="w-10 h-10 text-[#6B8EAF]" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-3">พร้อมวิเคราะห์ตลาดแล้วหรือยัง?</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                คลิกที่ปุ่มเพื่อเริ่มต้นวิเคราะห์ข้อมูลเชิงลึก ตามข้อมูลยอดขาย, ข้อมูลคลังสินค้า, สภาพอากาศ และเทรนด์ในพื้นที่ของคุณ
              </p>
              <button
                onClick={loadInsights}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#4A4541] text-white rounded-2xl hover:bg-[#5B5551] transition-all duration-300"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">เริ่มต้นวิเคราะห์</span>
              </button>
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
                  className="bg-white rounded-3xl border border-[#E8E2DB] p-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F2F0ED] animate-pulse" />
                    <div className="h-6 w-48 bg-[#F2F0ED] rounded-lg animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-[#F7F6F4] rounded-lg animate-pulse" />
                    <div className="h-4 w-3/4 bg-[#F7F6F4] rounded-lg animate-pulse" />
                    <div className="h-4 w-5/6 bg-[#F7F6F4] rounded-lg animate-pulse" />
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
              className="bg-[#FDF4F4] border border-[#F4D6D6] rounded-3xl p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F4D6D6] flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold text-[#8B4A4A] mb-2">เกิดข้อผิดพลาด</h3>
              <p className="text-[#A65A5A] mb-6">ไม่สามารถโหลดข้อมูลวิเคราะห์ได้ในขณะนี้</p>
              <button
                onClick={loadInsights}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#A65A5A] text-white rounded-xl hover:bg-[#8B4A4A] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ลองอีกครั้ง</span>
              </button>
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
                <div className="bg-white rounded-3xl border border-[#E8E2DB] hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                  <div className="flex items-start gap-5 mb-6">
                    <div className="p-4 bg-[#E6F0E6] rounded-2xl">
                      <Database className="w-7 h-7 text-[#6B9B6B]" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1">
                        สถานะการเชื่อมต่อฐานข้อมูลคลังสินค้า
                      </h2>
                      <p className="text-slate-400 text-sm">การตรวจสอบความถูกต้องและการซิงโครไนซ์ข้อมูล</p>
                    </div>
                  </div>

                  {insights.inventoryData && insights.validationReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#F7F9F7] rounded-2xl p-4 border border-[#E4EBE4]">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5 text-[#6B9B6B]" />
                            <span className="text-xs font-medium text-slate-500">รายการที่ถูกต้อง</span>
                          </div>
                          <div className="text-2xl font-semibold text-slate-800">{insights.validationReport.validItems}</div>
                        </div>
                        
                        <div className="bg-[#F9F7F4] rounded-2xl p-4 border border-[#EBE6DB]">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-[#B38F5E]" />
                            <span className="text-xs font-medium text-slate-500">สินค้าต่ำกว่าจุดสั่งซื้อ</span>
                          </div>
                          <div className="text-2xl font-semibold text-slate-800">{insights.validationReport.itemsWithLowStock}</div>
                        </div>
                        
                        <div className="bg-[#F9F4F4] rounded-2xl p-4 border border-[#EBE0E0]">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-5 h-5 text-[#A65A5A]" />
                            <span className="text-xs font-medium text-slate-500">รายการที่ไม่ถูกต้อง</span>
                          </div>
                          <div className="text-2xl font-semibold text-slate-800">{insights.validationReport.invalidItems}</div>
                        </div>
                        
                        <div className="bg-[#F0F4F8] rounded-2xl p-4 border border-[#DDE6EE]">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-[#6B8EAF]" />
                            <span className="text-xs font-medium text-slate-500">รายการทั้งหมด</span>
                          </div>
                          <div className="text-2xl font-semibold text-slate-800">{insights.validationReport.totalItems}</div>
                        </div>
                      </div>

                      {insights.validationReport.validationErrors.length > 0 && (
                        <div className="bg-[#FDF9F4] border border-[#F4E9D9] rounded-2xl p-4">
                          <h4 className="text-sm font-semibold text-[#9B7B5C] mb-2">รายการที่มีปัญหา:</h4>
                          <ul className="space-y-1 text-sm text-slate-600">
                            {insights.validationReport.validationErrors.slice(0, 5).map((err: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#9B7B5C] mt-1">•</span>
                                <span>{err}</span>
                              </li>
                            ))}
                            {insights.validationReport.validationErrors.length > 5 && (
                              <li className="text-xs text-slate-400">
                                +{insights.validationReport.validationErrors.length - 5} รายการอื่นๆ
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <div className="text-xs text-slate-400">
                        การซิงโครไนซ์ข้อมูลล่าสุด: {new Date(insights.inventoryData.lastSync).toLocaleString('th-TH')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-base">
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
                  <div className="bg-white rounded-3xl border border-[#E8E2DB] hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="p-4 bg-[#E6EEF6] rounded-2xl">
                        <Users className="w-7 h-7 text-[#6B8EAF]" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1">
                          พฤติกรรมผู้บริโภคในพื้นที่
                        </h2>
                        <p className="text-slate-400 text-sm">การวิเคราะห์พฤติกรรมและแนวโน้ม</p>
                      </div>
                    </div>
                    <div className="text-slate-600 text-base md:text-lg pl-2 border-l-4 border-[#BCD2E4]">
                      {formatContent(insights.behavior)}
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: Trends & Menu */}
                <motion.div variants={itemVariants} className="group">
                  <div className="bg-white rounded-3xl border border-[#E8E2DB] hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="p-4 bg-[#F5E6D3] rounded-2xl">
                        <Coffee className="w-7 h-7 text-[#9B7B5C]" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1">
                          กระแสเมนูและวัตถุดิบ
                        </h2>
                        <p className="text-slate-400 text-sm">เทรนด์ยอดนิยมและความนิยม</p>
                      </div>
                    </div>
                    <div className="text-slate-600 text-base md:text-lg pl-2 border-l-4 border-[#E8D0B8]">
                      {formatContent(insights.trends)}
                    </div>
                  </div>
                </motion.div>

                {/* Card 3: Strategy */}
                <motion.div variants={itemVariants} className="group">
                  <div className="bg-white rounded-3xl border border-[#E8E2DB] hover:-translate-y-1 transition-all duration-300 p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="p-4 bg-[#E6F0E6] rounded-2xl">
                        <Lightbulb className="w-7 h-7 text-[#6B9B6B]" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1">
                          แผนกลยุทธ์และโปรโมชั่น
                        </h2>
                        <p className="text-slate-400 text-sm">ข้อเสนอแนะและแผนปฏิบัติการ</p>
                      </div>
                    </div>
                    <div className="text-slate-600 text-base md:text-lg pl-2 border-l-4 border-[#BCE4BC]">
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
            <p className="text-slate-400 text-sm">
              อัปเดตครั้งล่าสุด: {new Date().toLocaleString('th-TH')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
