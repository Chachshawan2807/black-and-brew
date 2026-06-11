/**
 * Static metric glossary — zero API/token cost.
 * Shown via MetricInfoTip on hover/click only.
 */

export interface GlossaryEntry {
  title: string;
  description: string;
  formula?: string;
  source?: string;
}

export const MARKET_GLOSSARY = {
  weather_today: {
    title: 'อากาศวันนี้',
    description:
      'อุณหภูมิและสภาพอากาศปัจจุบันจาก OpenWeather ณ พิกัดร้าน ใช้ประกอบการวางแผนเมนูและบริการ',
    formula: 'พิกัดร้าน (LAT/LON) → OpenWeather Forecast API',
    source: 'OpenWeather · แคช 30 นาที',
  },
  mom_sales: {
    title: 'MoM — Month-over-Month',
    description:
      'อัตราเปลี่ยนแปลงรายได้รายเดือน เทียบเดือนล่าสุดกับเดือนก่อนหน้า มาตรฐาน Retail & F&B analytics',
    formula: '((รายได้เดือนล่าสุด − รายได้เดือนก่อน) ÷ รายได้เดือนก่อน) × 100',
    source: 'ยอดขายจาก Supabase (sales records)',
  },
  top_category: {
    title: 'หมวดเด่น (Revenue Mix)',
    description: 'หมวดสินค้าที่สร้างรายได้สูงสุดในช่วงข้อมูลทั้งหมด แสดงสัดส่วนต่อรายได้รวม',
    formula: 'สัดส่วน = (รายได้หมวด ÷ รายได้รวม) × 100',
    source: 'ยอดขายจาก Supabase',
  },
  shift_today: {
    title: 'กะวันนี้',
    description: 'จำนวนพนักงานที่มีกะทำงานวันนี้ เรียงตามเวลาเข้ากะจากตาราง Schedule',
    source: 'ตารางกะรายวัน (daily shifts)',
  },
  rain_probability: {
    title: 'โอกาสฝนช่วงเปิดร้าน',
    description:
      'ความน่าจะเป็นฝน (PoP) ราย 3 ชม. กรองเฉพาะช่วง 06:00–18:00 น. ตามเวลาไทย',
    formula: 'PoP = ความน่าจะเป็นฝนจากโมเดลพยากรณ์ (0–100%)',
    source: 'OpenWeather Forecast',
  },
  market_signals: {
    title: 'สัญญาณตลาด',
    description:
      'สัญญาณเชิงกติกาที่ระบบสร้างจากยอดขาย สต็อก อากาศ และเทรนด์ภายนอก ส่งให้ AI วิเคราะห์ — ไม่ใช่คำตอบสุดท้าย',
    formula: 'Rule-based: threshold ยอดขาย ±5%, สต็อกต่ำ, อุณหภูมิ ≥33°C, ฝน, keyword เทรนด์',
    source: 'คำนวณในระบบ (ไม่ใช้ AI)',
  },
  holidays: {
    title: 'วันหยุดใกล้นี้',
    description: 'วันหยุดนักขัตฤกษ์ใน 14 วันข้างหน้า มีผลต่อปริมาณลูกค้าและยอดขาย',
    source: 'ตาราง holidays (Supabase)',
  },
  monthly_revenue_trend: {
    title: 'แนวโน้มรายได้รายเดือน',
    description: 'รายได้รวมรายเดือน 6 เดือนล่าสุด ใช้ดู seasonality และ momentum',
    formula: 'SUM(total_amount) GROUP BY ปี-เดือน',
    source: 'ยอดขายจาก Supabase',
  },
  category_mix: {
    title: 'สัดส่วนรายได้ตามหมวด',
    description: 'Portfolio mix แบบ Revenue Share — แสดงการพึ่งพารายได้แต่ละหมวด (Pareto view)',
    formula: 'สัดส่วน = รายได้หมวด ÷ รายได้รวม × 100',
    source: 'ยอดขายจาก Supabase',
  },
  top_products: {
    title: 'เมนูขายดี',
    description: '5 อันดับแรกเรียงตามจำนวนที่ขายได้ (Units) ในช่วงข้อมูลทั้งหมด',
    formula: 'SUM(quantity) GROUP BY product_name · Top 5',
    source: 'ยอดขายจาก Supabase',
  },
  diff_banner: {
    title: 'การเปลี่ยนแปลงจากรอบก่อน',
    description:
      'เปรียบเทียบกับผลวิเคราะห์ครั้งล่าสุดที่แคชไว้ในเครื่อง ไม่เรียก API เพิ่ม',
    source: 'Client cache diff',
  },
  alerts_section: {
    title: 'สิ่งที่ต้องระวัง',
    description:
      'การแจ้งเตือนเชิงกฎ (rule-based) จากสต็อก × เมนูขายดี × อากาศ แยกจากข้อความ AI',
    source: 'คำนวณในระบบ (ไม่ใช้ AI)',
  },
  alert_stockout: {
    title: 'เสี่ยงของหมด',
    description: 'วัตถุดิบที่สต็อกต่ำกว่าจุดสั่งซื้อ และเกี่ยวข้องกับเมนูขายดี',
    formula: 'isLowStock = true AND ชื่อวัตถุดิบ overlap เมนู Top',
  },
  alert_overstock: {
    title: 'สต็อกเกิน',
    description: 'สต็อกเกินเป้าหมายมากกว่า 150% ควรระบายก่อนของเสีย',
    formula: 'stock > targetStock × 1.5',
  },
  alert_weather: {
    title: 'สภาพอากาศ',
    description: 'แนวโน้มฝนช่วงเปิดร้าน — เตรียมเมนูร้อนและบริการในร่ม',
  },
  alert_opportunity: {
    title: 'โอกาสขาย',
    description: 'อุณหภูมิ ≥33°C — โอกาสดันเครื่องดื่มเย็นและเมนูสดชื่น',
    formula: 'อุณหภูมิจากพยากรณ์ ≥ 33°C',
  },
  competitor_analysis: {
    title: 'วิเคราะห์คู่แข่ง',
    description:
      'ร้านคาเฟ่/กาแฟในรัศมีกระทบ ณ พิกัดร้าน (NEXT_PUBLIC_STORE_LAT/LON). มี GOOGLE_PLACES_API_KEY จะเรียก Places API (New) searchNearby ก่อน · ไม่มี key หรือ Google ว่างจะใช้ OpenStreetMap',
    formula: 'Haversine distance จากพิกัดร้าน',
    source: 'Places API (New) หรือ OpenStreetMap Overpass · แคช 1 ชม.',
  },
  competitor_zones: {
    title: 'โซนกระทบ',
    description:
      'Immediate ≤500m · Primary 500m–1.5km · Extended 1.5–5km ตามมาตรฐาน trade-area analysis',
    formula: 'Great-circle distance (WGS-84)',
  },
  competitor_segment: {
    title: 'เกณฑ์ Segment คู่แข่ง',
    description:
      'รวมเฉพาะแบรนด์เครือข่ายและสเปเชียลตี้ระดับพันธุ์ไทย/อเมซอน/สตาร์บัคส์ — ตัดร้านตลาดล่าง เซเว่น ชานม ปั๊มน้ำมัน',
    formula: 'ชื่อแบรนด์ + keyword specialty/roaster + price_level + คะแนนรีวิว',
    source: 'กฎในระบบ (ไม่ใช้ AI)',
  },
  competitor_threat: {
    title: 'ระดับภัยคู่แข่ง',
    description:
      'คะแนนจากระยะทาง + คะแนน Google + จำนวนรีวิว ใกล้และได้คะแนนสูง = ภัยสูง',
    formula: 'score = rating × log₁₀(reviews+1) ÷ (distance_km + 0.1)',
  },
  competitor_density: {
    title: 'ความหนาแน่นคู่แข่ง',
    description: 'จำนวนร้านที่ผ่าน segment ในรัศมี 5 กม. เทียบเกณฑ์ immediate/primary/extended',
    formula: '≤2 immediate = sparse · ≥3 = very_dense',
  },
  competitor_avg_rating: {
    title: 'คะแนนเฉลี่ยคู่แข่ง',
    description: 'ค่าเฉลี่ย arithmetic mean ของ Google rating ร้านที่มีคะแนน',
    formula: 'AVG(rating) WHERE rating IS NOT NULL',
  },
  behavior_insights: {
    title: 'พฤติกรรมผู้บริโภค',
    description:
      'บทวิเคราะห์จาก Gemini AI อ้างอิงสัญญาณภายใน ไม่ใช่การอ่านซ้ำตัวเลขดิบ',
    source: 'Gemini 2.5 Flash · เรียกเมื่อกดวิเคราะห์ใหม่เท่านั้น',
  },
  trends_insights: {
    title: 'กระแสเมนูและวัตถุดิบ',
    description: 'จับคู่เทรนด์ภายนอก (Tavily) กับจุดแข็งร้าน — สร้างเมื่อวิเคราะห์ใหม่',
    source: 'Gemini + Tavily',
  },
  strategy_insights: {
    title: 'แผนกลยุทธ์',
    description: 'มุมมองเชิงกลยุทธ์และโปรโมชั่น คำนึงข้อจำกัดสต็อกจากระบบ',
    source: 'Gemini 2.5 Flash',
  },
  action_checklist: {
    title: 'แผนปฏิบัติ',
    description:
      'รายการลงมือทำจริง เรียงตาม priority สถานะติ๊กเก็บในเครื่อง (localStorage) ไม่เรียก API',
    source: 'Gemini · สถานะติ๊ก = local only',
  },
  confidence: {
    title: 'ระดับความมั่นใจ',
    description:
      'High = หลายสัญญาณสอดคล้อง · Medium = สมเหตุสมผลแต่ข้อมูลจำกัด · Low = สมมติฐานเบื้องต้น',
    source: 'AI self-assessment',
  },
  external_sources: {
    title: 'แหล่งอ้างอิงเทรนด์',
    description: 'ลิงก์จาก Tavily web search แคช 30 นาที ไม่ดึงซ้ำจนกว่าจะวิเคราะห์ใหม่',
    source: 'Tavily Search',
  },
  data_freshness: {
    title: 'ความสดของข้อมูล',
    description:
      'โหลดข้อมูลเดิม = อ่านจากแคชในเครื่อง (0 API) · วิเคราะห์ใหม่ = ดึงข้อมูลล่าสุด + AI',
    formula: 'แคช client TTL 5 นาที · แสดงป้าย "ข้อมูลเก่า" เมื่อเกิน TTL',
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof MARKET_GLOSSARY;

/** Human-readable labels for rule-based signals */
export const SIGNAL_LABELS: Record<string, { label: string; tip: string }> = {
  'sales_momentum:positive': {
    label: 'ยอดขายโต',
    tip: 'MoM > +5% — momentum บวก',
  },
  'sales_momentum:declining': {
    label: 'ยอดขายลด',
    tip: 'MoM < −5% — momentum ลบ',
  },
  'weather:rainy': {
    label: 'ฝนช่วงเปิดร้าน',
    tip: 'พยากรณ์มีฝนหรือ PoP สูง',
  },
  'weather:hot': {
    label: 'อากาศร้อน',
    tip: 'อุณหภูมิ ≥ 33°C',
  },
  'market:matcha_interest': {
    label: 'เทรนด์มัทฉะ',
    tip: 'พบ keyword จากแหล่งภายนอก',
  },
  'market:oat_milk_interest': {
    label: 'เทรนด์นมโอ๊ต',
    tip: 'พบ keyword จากแหล่งภายนอก',
  },
  'baseline:stable_operations': {
    label: 'ดำเนินงานปกติ',
    tip: 'ไม่มีสัญญาณผิดปกติ',
  },
  'check:top_sellers_vs_low_stock_overlap': {
    label: 'สต็อก vs เมนูขายดี',
    tip: 'วัตถุดิบเมนูเด่นใกล้หมด',
  },
};

export function humanizeSignal(raw: string): { label: string; tip?: string } {
  if (SIGNAL_LABELS[raw]) return SIGNAL_LABELS[raw];
  if (raw.startsWith('category_gap:')) {
    const parts = raw.replace('category_gap:', '').split('_strong_vs_');
    return {
      label: `หมวด${parts[0] ?? '?'}แข็ง`,
      tip: `เทียบกับหมวด${parts[1] ?? 'อื่น'}ที่อ่อนกว่า`,
    };
  }
  return { label: raw, tip: undefined };
}
