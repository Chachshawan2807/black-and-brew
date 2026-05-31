import React from 'react';
import { getMarketInsights } from '@/app/actions/market-insights-actions';
import { getTranslations } from 'next-intl/server';

/**
 * Market Insights Page - Server Component (Async)
 * สรุปพฤติกรรมผู้บริโภคและเทรนด์ตลาดรอบร้านย่านลำลูกกา
 * บังคับใช้ Zero-Bold Policy และดีไซน์แบบพาสเทลครีมเพื่อ High Visibility
 */
export default async function MarketInsightsPage() {
  const t = await getTranslations('MarketInsights');
  const insights = await getMarketInsights();

  if (!insights) {
    return (
      <div className="p-6 text-black font-normal bg-[#fdfcf0] min-h-screen antialiased">
        <p>เกิดข้อผิดพลาดในการโหลดข้อมูลค่ะ ลองใหม่อีกครั้งนะคะ</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf0] p-4 md:p-8 text-black antialiased flex flex-col gap-6 max-w-4xl mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-normal text-black leading-tight">{t('title')}</h1>
        <p className="text-sm text-neutral-500 font-normal">{t('description')}</p>
      </header>

      <div className="flex flex-col gap-4">
        {/* Card 1: พฤติกรรมผู้บริโภค */}
        <article className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👥</span>
            <h2 className="text-lg font-normal text-black">พฤติกรรมผู้บริโภคในพื้นที่</h2>
          </div>
          <p className="text-black font-normal leading-relaxed text-[15px]">
            {insights.behavior}
          </p>
        </article>

        {/* Card 2: กระแสเมนูฮิต */}
        <article className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">☕</span>
            <h2 className="text-lg font-normal text-black">{t('externalData')}</h2>
          </div>
          <p className="text-black font-normal leading-relaxed text-[15px]">
            {insights.trends}
          </p>
        </article>

        {/* Card 3: กลยุทธ์ประจำสัปดาห์ */}
        <article className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💡</span>
            <h2 className="text-lg font-normal text-black">{t('strategy')}</h2>
          </div>
          <p className="text-black font-normal leading-relaxed text-[15px]">
            {insights.strategy}
          </p>
        </article>
      </div>
    </div>
  );
}