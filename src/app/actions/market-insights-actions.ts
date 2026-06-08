'use server';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { ensureServerSession } from '@/lib/security/server-auth';
import { fetchComprehensiveInventoryData } from './inventory-actions';
import { getSalesMetrics } from './sales-actions';
import {
  buildSalesContext,
  buildInventoryContext,
  buildScheduleContext,
  buildAnalyticalSignals,
} from './market-insights-context';
import { fetchTavily } from '@/lib/external/tavily-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = (): SupabaseClient | null => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey);
};

const SYSTEM_PROMPT = `คุณคือ "บรู" ที่ปรึกษากลยุทธ์ตลาด BLACKANDBREW ย่านลำลูกกา
ข้อมูลด้านล่างเป็นข้อมูลดิบภายใน — ห้ามอ่านซ้ำ ห้ามแจ้งเตือนสต็อก/ยอดขาย/จำนวนที่ผู้จัดการเห็นอยู่แล้ว
งาน: วิเคราะห์เชิงลึก ประกอบข้อมูลภายใน + อากาศ + เทรนด์ภายนอก + ความรู้ตลาดกาแฟไทย
ให้ insight ที่นำไปทำได้จริง: โอกาส ความเสี่ยง แนวโน้มพฤติกรรม กลยุทธ์เมนู/โปรโมชั่น
กฎรูปแบบ: ไม่ทักทาย ไม่หัวข้อซ้ำ ไม่ตัวหนา แต่ละข้อ ≤30 คำ ลงท้าย ค่ะ/นะคะ ขึ้นต้น -
Output 3 ส่วนคั่น ||| ไม่ใส่ label ส่วนที่
strategy จบที่ bullet สุดท้าย ห้ามประโยคปิดท้าย`;

async function fetchWeather(): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
  const lon = process.env.NEXT_PUBLIC_STORE_LON || '100.716932';

  if (!apiKey) return 'N/A';

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`
    );
    if (!response.ok) return 'N/A';
    const data = await response.json();
    return `${data.weather[0]?.description} ${data.main?.temp}°C`;
  } catch {
    return 'N/A';
  }
}

async function fetchLocalTrends(): Promise<string> {
  const lat = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
  const lon = process.env.NEXT_PUBLIC_STORE_LON || '100.716932';

  try {
    const results = await fetchTavily(
      `Coffee cafe trends Lam Luk Ka Pathum Thani ${lat},${lon} 2026`,
      { userId: 'market-insights-service' }
    );
    const raw = results
      .map((r) => `${r.title}: ${r.content.slice(0, 120)}`)
      .join(' | ');
    return raw.slice(0, 400) || 'N/A';
  } catch (error) {
    console.error('[fetchLocalTrends] Error:', error);
    return 'N/A';
  }
}

async function fetchSupabaseContext(supabase: SupabaseClient) {
  const [
    storeStatusRes,
    purchaseOrdersRes,
    recentTxRes,
    todayScheduleRes,
  ] = await Promise.all([
    supabase.rpc('get_ai_store_status'),
    supabase.from('ai_purchase_orders_needed').select('name, qty_to_order, unit, source'),
    supabase.from('ai_recent_transactions').select('item_name, type, quantity, balance_after, note, created_at_local').limit(10),
    supabase.rpc('get_today_schedule'),
  ]);

  if (storeStatusRes.error) {
    console.error('[fetchSupabaseContext] store status:', storeStatusRes.error.message);
  }
  if (purchaseOrdersRes.error) {
    console.error('[fetchSupabaseContext] purchase orders:', purchaseOrdersRes.error.message);
  }
  if (recentTxRes.error) {
    console.error('[fetchSupabaseContext] recent tx:', recentTxRes.error.message);
  }
  if (todayScheduleRes.error) {
    console.error('[fetchSupabaseContext] schedule:', todayScheduleRes.error.message);
  }

  return {
    storeStatus: storeStatusRes.data,
    purchaseOrders: purchaseOrdersRes.data ?? [],
    recentTransactions: recentTxRes.data ?? [],
    todaySchedule: todayScheduleRes.data ?? [],
  };
}

/**
 * AI-powered Market Insights generator.
 * Fetches all Supabase data server-side; uses external APIs for weather/trends only.
 */
export async function getMarketInsights(_legacySalesData?: unknown) {
  void _legacySalesData;

  const auth = await ensureServerSession();
  if (!auth.ok) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();

    const [weatherData, externalTrends, inventoryResult, salesMetrics, supabaseCtx] =
      await Promise.all([
        fetchWeather(),
        fetchLocalTrends(),
        fetchComprehensiveInventoryData(),
        getSalesMetrics(),
        supabase ? fetchSupabaseContext(supabase) : Promise.resolve(null),
      ]);

    let inventorySummary = 'N/A';
    let invItems: { name: string; stock: number; isLowStock: boolean }[] = [];

    if (inventoryResult.success && inventoryResult.data) {
      const invData = inventoryResult.data;
      invItems = invData.items;
      inventorySummary = buildInventoryContext(
        invData.items,
        supabaseCtx?.purchaseOrders ?? [],
        supabaseCtx?.recentTransactions ?? []
      );
    }

    const salesSummary = buildSalesContext(salesMetrics);
    const scheduleSummary = supabaseCtx
      ? buildScheduleContext(supabaseCtx.todaySchedule)
      : 'N/A';
    const shiftCount = supabaseCtx?.storeStatus
      ? ((supabaseCtx.storeStatus as { shifts?: unknown[] }).shifts?.length ?? 0)
      : 0;

    const topProductNames = salesMetrics?.topProducts.slice(0, 5).map((p) => p.productName) ?? [];
    const signals = buildAnalyticalSignals(
      salesMetrics,
      invItems,
      topProductNames,
      weatherData,
      externalTrends
    );

    const dataBlock = [
      `[INTERNAL — ห้ามอ่านซ้ำในคำตอบ]`,
      `SALES: ${salesSummary}`,
      `INV: ${inventorySummary}`,
      shiftCount ? `SHIFTS: ${shiftCount} | ${scheduleSummary}` : `SCHEDULE: ${scheduleSummary}`,
      `WEATHER: ${weatherData}`,
      `TRENDS: ${externalTrends}`,
      `SIGNALS: ${signals}`,
    ].join('\n');

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `${dataBlock}

วิเคราะห์เชิงลึก (ห้ามพูดถึงตัวเลขดิบ/รายการสต็อก/สถานะ DB):
ส่วน1 พฤติกรรมผู้บริโภค — ทำไมลูกค้าย่านนี้ซื้อ/ไม่ซื้อ โอกาสจากอากาศและเทรนด์ (3 bullets) |||
ส่วน2 กระแสเมนูและวัตถุดิบ — จับคู่เทรนด์ภายนอกกับจุดแข็งร้าน (3 bullets) |||
ส่วน3 กลยุทธ์และโปรโมชั่น — แผนปฏิบัติสัปดาห์นี้ที่ทำได้ทันที (3 bullets จบที่ bullet สุดท้าย)`,
      providerOptions: {
        google: {
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.45,
          },
        },
      },
    });

    const parts = text.split('|||').map((p) => p.trim());
    return {
      behavior: parts[0] || 'ไม่พบข้อมูลค่ะ',
      trends: parts[1] || 'ไม่พบข้อมูลค่ะ',
      strategy: parts[2] || 'ไม่พบข้อมูลค่ะ',
    };
  } catch (error) {
    console.error('[getMarketInsights] Error:', error);
    return null;
  }
}
