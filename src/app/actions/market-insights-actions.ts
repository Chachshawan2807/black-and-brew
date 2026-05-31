'use server';

import { createClient } from '@supabase/supabase-js';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = () => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey);
};

/**
 * Fetches current weather for regional context (Data Priority 1).
 */
async function fetchWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
  const lon = process.env.NEXT_PUBLIC_STORE_LON || '100.716932';

  if (!apiKey) return "ไม่สามารถดึงข้อมูลอากาศได้ค่ะ";

  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`);
    if (!response.ok) return "ข้อมูลอากาศขัดข้องค่ะ";
    const data = await response.json();
    return `อากาศตอนนี้: ${data.weather[0]?.description}, อุณหภูมิ: ${data.main?.temp}°C`;
  } catch (e) { return "เกิดข้อผิดพลาดทางเทคนิคในการเช็คสภาพอากาศค่ะ"; }
}

/**
 * Fetches real-time search results from Tavily to understand local trends.
 */
async function fetchLocalTrends() {
  const apiKey = process.env.TAVILY_API_KEY;
  const lat = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
  const lon = process.env.NEXT_PUBLIC_STORE_LON || '100.716932';

  if (!apiKey) return "ไม่สามารถดึงข้อมูลเทรนด์ภายนอกได้เนื่องจากขาด API Key ค่ะ";

  try {
    const query = `Coffee trends, cafe reviews, and consumer behavior in Lam Luk Ka, Pathum Thani near coordinates ${lat}, ${lon} year 2026`;
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5
      })
    });

    if (!response.ok) throw new Error("Tavily API Error");
    const data = await response.json();
    return data.results.map((r: any) => `${r.title}: ${r.content}`).join("\n\n");
  } catch (error) {
    console.error('[fetchLocalTrends] Error:', error);
    return "เกิดข้อผิดพลาดในการดึงข้อมูลเทรนด์ภายนอกค่ะ";
  }
}

/**
 * Fetches popular items from internal sales (inventory transactions).
 */
async function fetchInternalPopularity() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: txs, error: txError } = await supabase
      .from('inventory_transactions')
      .select('inventory_item_id, quantity')
      .eq('type', 'OUT')
      .gte('created_at', sixMonthsAgo.toISOString());

    if (txError) throw txError;
    if (!txs || txs.length === 0) return [];

    const counts: Record<string, number> = {};
    txs.forEach(t => {
      counts[t.inventory_item_id] = (counts[t.inventory_item_id] || 0) + Number(t.quantity);
    });

    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);

    const { data: items, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, name')
      .in('id', sortedIds);

    if (itemError) throw itemError;

    return sortedIds.map(id => {
      const item = items?.find(i => i.id === id);
      return { name: item?.name || 'Unknown', count: counts[id] };
    });
  } catch (error) {
    console.error('[fetchInternalPopularity] Error:', error);
    return [];
  }
}

/**
 * AI-powered Market Insights generator.
 * Persona: Bru (Professional, Sweet, Zero-Bold).
 */
export async function getMarketInsights() {
  try {
    const [weatherData, externalTrends, internalData] = await Promise.all([
      fetchWeather(),
      fetchLocalTrends(),
      fetchInternalPopularity()
    ]);

    const internalSummary = internalData.length > 0 
      ? internalData.map(i => `${i.name} (${i.count} units)`).join(', ')
      : 'ไม่มีข้อมูลยอดขายสะสมในช่วง 6 เดือนที่ผ่านมาค่ะ';

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: `คุณคือ "บรู" AI ผู้ช่วยผู้จัดการหญิงของร้าน BLACKANDBREW 
      สรุปอินไซต์ตลาดและพฤติกรรมผู้บริโภคย่านลำลูกกาให้กระชับ ตรงประเด็นขั้นสูงสุด (Hyper-Concise)
      ห้ามทักทาย ห้ามเกริ่นนำ ห้ามพิมพ์ข้อความนำหน้าประเภท "ส่วนที่ 1" หรือชื่อหัวข้อซ้ำซ้อนเด็ดขาด
      บังคับฟอร์แมต: ทุกข้อย่อยต้องขึ้นต้นด้วยเครื่องหมายลบ (-) และต้องเคาะขึ้นบรรทัดใหม่จริง (\\n) ทันที
      เน้นอินไซต์ย่านลำลูกกา, มัทฉะ Bluekoff, นมโอ๊ต และถุงซิปล็อค
      ใช้คำลงท้าย "ค่ะ" หรือ "นะคะ" 100% และห้ามใช้ตัวหนา (No ** / No bold) โดยเด็ดขาด
      [CRITICAL] ในส่วนที่ 3 ห้ามใส่ประโยคห่วงใยพนักงานหรือคำอวยพรปิดท้ายเด็ดขาด ให้จบที่เนื้อหากลยุทธ์ข้อสุดท้ายทันที`,
      prompt: `ข้อมูลสำหรับวิเคราะห์:
      - สภาพอากาศภูมิภาค: ${weatherData}
      - ข้อมูลธุรกรรมสะสม 6 เดือนในร้าน: ${internalSummary}
      - เทรนด์พื้นที่และรีวิวรอบร้าน: ${externalTrends}

      โปรดวิเคราะห์และสรุปเอาต์พุต 3 ส่วน คั่นด้วยเครื่องหมาย "|||":
      ส่วนที่ 1 (behavior): พฤติกรรมผู้บริโภคในพื้นที่ (3 ข้อสั้นกระชับ เริ่มด้วย -)
      - ข้อที่ 1
      - ข้อที่ 2
      - ข้อที่ 3
      ส่วนที่ 2 (trends): กระแสเมนูและวัตถุดิบ (3 ข้อสั้นกระชับ เริ่มด้วย - )
      - ข้อที่ 1
      - ข้อที่ 2
      - ข้อที่ 3
      ส่วนที่ 3 (strategy): แผนกลยุทธ์และโปรโมชั่น (3 ข้อสั้นกระชับ เริ่มด้วย - ) จบเนื้อหาทันที ห้ามมีประโยคปิดท้าย
      - ข้อที่ 1
      - ข้อที่ 2
      - ข้อที่ 3`,
    });

    const parts = text.split('|||').map(p => p.trim());
    return {
      behavior: parts[0] || 'ไม่พบข้อมูลค่ะ',
      trends: parts[1] || 'ไม่พบข้อมูลค่ะ',
      strategy: parts[2] || 'ไม่พบข้อมูลค่ะ',
      internalTopItems: internalData
    };
  } catch (error) {
    console.error('[getMarketInsights] Error:', error);
    return null;
  }
}