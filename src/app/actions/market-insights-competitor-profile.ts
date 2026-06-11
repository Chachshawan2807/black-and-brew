import type { CompetitorEntry } from './market-insights-types';

export interface PlaceReviewSnippet {
  text: string;
  rating?: number;
}

const OWN_STORE_PATTERNS = [
  /black\s*(?:and|&)\s*brew/i,
  /blackandbrew/i,
  /black\s*and\s*brew\.?coffee/i,
  /แบล็ค\s*(?:แอนด์|และ)\s*บรูว/i,
];

/** True when the POI is our store (exclude from competitor analysis). */
export function isOwnStore(name: string, distanceMeters?: number): boolean {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
  const compact = normalized.replace(/[^a-z0-9]/g, '');

  if (/blackandbrew/.test(compact) || /black.*brew.*coffee/.test(normalized)) {
    return true;
  }

  if (
    distanceMeters != null &&
    distanceMeters <= 100 &&
    /black/i.test(normalized) &&
    /brew/i.test(normalized)
  ) {
    return true;
  }

  return OWN_STORE_PATTERNS.some((pattern) => pattern.test(normalized));
}

const REVIEW_THEME_RULES: Array<{
  label: string;
  type: 'strength' | 'weakness';
  patterns: RegExp[];
}> = [
  {
    label: 'รสชาติกาแฟได้รับการชื่นชม',
    type: 'strength',
    patterns: [/อร่อย|delicious|good coffee|great coffee|รสชาติ|smooth|creamy|ลาเต้|latte|espresso|กาแฟหอม/i],
  },
  {
    label: 'บรรยากาศร้านดี',
    type: 'strength',
    patterns: [/บรรยากาศ|atmosphere|cozy|relax|เงียบสงบ|สวย|minimal|น่านั่ง/i],
  },
  {
    label: 'บริการดี / พนักงานเป็นกันเอง',
    type: 'strength',
    patterns: [/บริการดี|friendly|kind|staff|พนักงาน|service|ใส่ใจ/i],
  },
  {
    label: 'เบเกอรี่/ขนมได้รับความนิยม',
    type: 'strength',
    patterns: [/ขนม|เบเกอรี่|bakery|croissant|เค้ก|cake|pastry/i],
  },
  {
    label: 'ราคาคุ้มค่า',
    type: 'strength',
    patterns: [/คุ้ม|worth|reasonable|ราคาดี|ไม่แพง/i],
  },
  {
    label: 'ที่นั่ง/พื้นที่ทำงานเหมาะ',
    type: 'strength',
    patterns: [/ที่นั่ง|wifi|wi-fi|workspace|นั่งทำงาน|โต๊ะ/i],
  },
  {
    label: 'รอนาน / บริการช้า',
    type: 'weakness',
    patterns: [/ช้า|slow|รอนาน|wait too long|คิวยาว/i],
  },
  {
    label: 'ราคาค่อนสูง',
    type: 'weakness',
    patterns: [/แพง|expensive|overpriced|ราคาสูง/i],
  },
  {
    label: 'ที่จอดรถไม่สะดวก',
    type: 'weakness',
    patterns: [/จอดรถยาก|parking|ที่จอด/i],
  },
  {
    label: 'พื้นที่แคบ / ที่นั่งน้อย',
    type: 'weakness',
    patterns: [/แคบ|cramped|crowded|เต็ม|ที่นั่งน้อย|no seat/i],
  },
  {
    label: 'รสชาติกาแฟไม่คงที่',
    type: 'weakness',
    patterns: [/จืด|bitter|ไม่อร่อย|bad coffee|ไม่ค่อยดี|ผิดหวัง/i],
  },
];

/** Derive strengths/weaknesses from Google Maps review text. */
export function analyzeReviewsFromText(reviews: PlaceReviewSnippet[]): {
  strengths: string[];
  weaknesses: string[];
} {
  if (reviews.length === 0) {
    return { strengths: [], weaknesses: [] };
  }

  const positiveText = reviews
    .filter((r) => (r.rating ?? 5) >= 4)
    .map((r) => r.text)
    .join(' ');
  const negativeText = reviews
    .filter((r) => (r.rating ?? 5) <= 3)
    .map((r) => r.text)
    .join(' ');
  const allText = reviews.map((r) => r.text).join(' ');

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const rule of REVIEW_THEME_RULES) {
    const haystack =
      rule.type === 'strength'
        ? positiveText || allText
        : negativeText || allText;
    if (rule.patterns.some((p) => p.test(haystack))) {
      (rule.type === 'strength' ? strengths : weaknesses).push(rule.label);
    }
  }

  const lowRated = reviews.filter((r) => (r.rating ?? 5) <= 2).length;
  const highRated = reviews.filter((r) => (r.rating ?? 0) >= 4).length;

  if (highRated >= 3 && strengths.length === 0) {
    strengths.push('รีวิวส่วนใหญ่ให้คะแนนสูง');
  }
  if (lowRated >= 2 && weaknesses.length === 0) {
    weaknesses.push('มีรีวิวเชิงลบหลายรายการ');
  }

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
  };
}
/** Extract Facebook fanpage URL from Google Maps websiteUri when present. */
export function extractFacebookUrl(websiteUri?: string): string | undefined {
  if (!websiteUri?.trim()) return undefined;

  try {
    const url = new URL(websiteUri.trim());
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'facebook.com' || host === 'fb.com' || host === 'm.facebook.com') {
      const path = url.pathname.replace(/\/+$/, '');
      if (path && path !== '/') {
        return `https://www.facebook.com${path}`;
      }
    }
  } catch {
    // fall through to regex
  }

  const fbMatch = websiteUri.match(
    /https?:\/\/(?:www\.|m\.)?(?:facebook|fb)\.com\/[^\s?#]+/i
  );
  return fbMatch?.[0];
}

export function analyzeCompetitorProfile(entry: CompetitorEntry): {
  strengths: string[];
  weaknesses: string[];
} {
  if (entry.reviewSnippets && entry.reviewSnippets.length > 0) {
    const fromReviews = analyzeReviewsFromText(entry.reviewSnippets);
    if (fromReviews.strengths.length > 0 || fromReviews.weaknesses.length > 0) {
      return fromReviews;
    }
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const reviews = entry.userRatingsTotal ?? 0;
  const rating = entry.rating;

  if (entry.facebookUrl) {
    strengths.push('มี Facebook จาก Google Maps');
  }

  if (entry.distanceMeters <= 500) {
    strengths.push('อยู่ใกล้มาก — ลูกค้าเปรียบเทียบได้ทันที');
  } else if (entry.distanceMeters <= 1500) {
    strengths.push('อยู่ในโซนหลัก — แย่งลูกค้าในพื้นที่เดียวกัน');
  }

  if (rating != null && rating >= 4.5) {
    strengths.push(`คะแนนรีวิวสูง (${rating}★)`);
  } else if (rating != null && rating >= 4.0) {
    strengths.push(`คะแนนรีวิวดี (${rating}★)`);
  }

  if (reviews >= 150) {
    strengths.push(`รีวิวจำนวนมาก (${reviews}) — ความน่าเชื่อถือสูง`);
  } else if (reviews >= 50) {
    strengths.push(`มีฐานรีวิว (${reviews})`);
  }

  if (entry.priceLevel != null && entry.priceLevel >= 3) {
    strengths.push('จุดราคาพรีเมียม');
  }

  if (entry.segmentLabel?.includes('แบรนด์')) {
    strengths.push('แบรนด์เครือข่าย — การรับรู้สูง');
  } else if (entry.segmentLabel === 'สเปเชียลตี้') {
    strengths.push('สเปเชียลตี้ — กลุ่มลูกค้าเป้าหมายใกล้เคียง');
  }

  if (entry.openNow === true) {
    strengths.push('เปิดให้บริการขณะสแกน');
  }

  if (entry.distanceMeters > 3000) {
    weaknesses.push('อยู่ไกล — กระทบโดยตรงน้อยกว่าโซนใกล้');
  }

  if (rating == null) {
    weaknesses.push('ไม่มีคะแนนรีวิวใน Google Maps');
  } else if (rating < 4.0) {
    weaknesses.push(`คะแนนรีวิวต่ำ (${rating}★)`);
  }

  if (reviews < 30) {
    weaknesses.push('รีวิวน้อย — ยังสร้างความไว้วางใจได้ไม่มาก');
  }

  if (!entry.facebookUrl) {
    weaknesses.push('ไม่พบ Facebook ใน Google Maps');
  }

  if (entry.openNow === false) {
    weaknesses.push('ปิดอยู่ขณะสแกน');
  }

  if (entry.priceLevel === 1) {
    weaknesses.push('จุดราคาต่ำ — กลุ่มลูกค้าอาจต่าง segment');
  }

  if (strengths.length === 0 && weaknesses.length === 0) {
    weaknesses.push('ยังไม่มีข้อความรีวิวจาก Google Maps สำหรับวิเคราะห์');
  }

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
  };
}
