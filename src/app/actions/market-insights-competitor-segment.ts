import type { RawPlaceResult } from './market-insights-competitors';

/** Comparable to BLACKANDBREW — specialty / national chain tier (not lower-market stalls). */
export const SEGMENT_CRITERIA_LABEL =
  'เครือข่ายระดับพันธุ์ไทย · อเมซอน · สตาร์บัคส์ · สเปเชียลตี้';

export interface SegmentMatch {
  included: boolean;
  label?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Hard exclude — convenience / lower-tier / non-coffee-primary */
const EXCLUDE_SUBSTRINGS = [
  '7-eleven',
  '7 eleven',
  'seven eleven',
  'เซเว่น',
  'family mart',
  'แฟมิลี่มาร์ท',
  'lotus go',
  'โลตัส โก',
  'mini big c',
  'มินิบิ๊กซี',
  'ปั๊มน้ำมัน',
  'ปตท.',
  'shell ',
  'เชลล์',
  'บางจาก',
  'caltex',
  'กาแฟถัง',
  'กาแฟโบราณ',
  'ชานมไข่มุก',
  'milk tea',
  'bubble tea',
  'ชาตรามือ',
  'koi thé',
  'koi the',
  'fire tiger',
  'ไฟร์ไทเกอร์',
  'มานาลี',
  'manlee',
  'swensen',
  'mr. donut',
  'mister donut',
  'dairy queen',
];

/** Known chain / specialty brands — same tier as store */
const BRAND_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /starbucks|สตาร์บัคส์|สตาร์บัค/, label: 'แบรนด์เครือข่าย' },
  { pattern: /amazon|อเมซอน|café amazon|cafe amazon|คาเฟ่ อเมซอน/, label: 'แบรนด์เครือข่าย' },
  { pattern: /punthai|pun thai|พันธุ์ไทย|พันธ์ไทย|กาแฟพันธุ์ไทย/, label: 'แบรนด์เครือข่าย' },
  { pattern: /truecoffee|true coffee|ทรูคอฟฟี่|ทรู คอฟฟี่/, label: 'แบรนด์เครือข่าย' },
  { pattern: /black canyon|แบล็คคานยอน/, label: 'แบรนด์เครือข่าย' },
  { pattern: /doi chaang|ดอยช้าง/, label: 'สเปเชียลตี้' },
  { pattern: /pacamara|พาคามาร่า/, label: 'สเปเชียลตี้' },
  { pattern: /% arabica|percent arabica/, label: 'สเปเชียลตี้' },
  { pattern: /roots coffee|รูทส์/, label: 'สเปเชียลตี้' },
  { pattern: /warehouse|เวอร์เฮ้าส์/, label: 'สเปเชียลตี้' },
  { pattern: /wonders coffee|วันเดอร์/, label: 'สเปเชียลตี้' },
  { pattern: /graph coffee|กราฟ คอฟฟี่/, label: 'สเปเชียลตี้' },
  { pattern: /karo coffee|คาโร/, label: 'สเปเชียลตี้' },
  { pattern: /seattle|ซีแอตเทิล/, label: 'สเปเชียลตี้' },
  { pattern: /beans talk|บีนส์ทอล์ค/, label: 'สเปเชียลตี้' },
  { pattern: /half ounce/, label: 'สเปเชียลตี้' },
  { pattern: /someday coffee|ซัมเดย์/, label: 'สเปเชียลตี้' },
  { pattern: /ink.?&?.?lion|อิงค์/, label: 'สเปเชียลตี้' },
];

const SPECIALTY_KEYWORDS = [
  'specialty',
  'สเปเชียลตี้',
  'speciality',
  'third wave',
  'third-wave',
  'roaster',
  'roastery',
  'โรงคั่ว',
  'single origin',
  'slow bar',
  'craft coffee',
  'micro roaster',
  'artisan',
];

/**
 * Include only competitors in a comparable market segment.
 * Excludes convenience / lower-tier; includes chains + specialty signals.
 */
export function matchCompetitorSegment(place: RawPlaceResult): SegmentMatch {
  const haystack = normalize(`${place.name ?? ''} ${place.vicinity ?? ''}`);

  if (!haystack || haystack.length < 2) return { included: false };

  for (const ex of EXCLUDE_SUBSTRINGS) {
    if (haystack.includes(ex)) return { included: false };
  }

  for (const { pattern, label } of BRAND_RULES) {
    if (pattern.test(haystack)) return { included: true, label };
  }

  for (const kw of SPECIALTY_KEYWORDS) {
    if (haystack.includes(kw)) return { included: true, label: 'สเปเชียลตี้' };
  }

  // Google price_level: 1 = inexpensive (usually lower-tier for our segment)
  if (place.price_level === 1) return { included: false };
  if (place.price_level != null && place.price_level >= 3) {
    return { included: true, label: 'พรีเมียม' };
  }

  // Strong social proof — likely established chain / destination café
  const reviews = place.user_ratings_total ?? 0;
  const rating = place.rating ?? 0;
  if (reviews >= 120 && rating >= 4.2) {
    return { included: true, label: 'เครือข่าย/ยอดนิยม' };
  }
  if (reviews >= 60 && rating >= 4.0 && (place.price_level ?? 2) >= 2) {
    return { included: true, label: 'กลุ่มกลาง-บน' };
  }

  return { included: false };
}

export function filterComparableCompetitors(places: RawPlaceResult[]): RawPlaceResult[] {
  return places.filter((p) => matchCompetitorSegment(p).included);
}
