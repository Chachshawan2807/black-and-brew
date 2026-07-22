const EXACT_TRACKING_DETAIL_LABELS: Record<string, string> = {
  'successfully delivered': 'จัดส่งสำเร็จ',
  'courier has contacted the recipient': 'พนักงานติดต่อผู้รับแล้ว',
  'out for delivery': 'กำลังนำจ่ายพัสดุ',
  'arrived at the destination station': 'ถึงสาขาปลายทางแล้ว',
  'departed from distribution center': 'ออกจากศูนย์กระจายสินค้าแล้ว',
  'arrived at distribution center': 'ถึงศูนย์กระจายสินค้าแล้ว',
  'your parcel has been dropped at kex service point': 'ฝากพัสดุที่จุดบริการ KEX แล้ว',
  'sender dropped off at branch': 'ผู้ส่งนำฝากที่สาขาแล้ว',
  'parcel has been collected': 'รับพัสดุเข้าระบบแล้ว',
  'picked up': 'รับพัสดุแล้ว',
  'in transit': 'อยู่ระหว่างขนส่ง',
  'delivery attempted': 'พยายามจัดส่งแล้ว',
  'delivery failed': 'จัดส่งไม่สำเร็จ',
  'returned to sender': 'ส่งคืนผู้ส่งแล้ว',
  'exception': 'มีปัญหาการจัดส่ง',
};

const TRACKING_DETAIL_PATTERNS: Array<{
  pattern: RegExp;
  label: string | ((match: RegExpMatchArray) => string);
}> = [
  {
    pattern: /^your parcel will be delivered by (.+)$/i,
    label: (match) => `คาดว่าจะจัดส่งภายใน ${match[1]}`,
  },
  {
    pattern: /^your parcel has been dropped at (.+) service point$/i,
    label: (match) => `ฝากพัสดุที่จุดบริการ ${match[1]} แล้ว`,
  },
  {
    pattern: /^arrived at (.+)$/i,
    label: (match) => `ถึง ${match[1]} แล้ว`,
  },
  {
    pattern: /^departed from (.+)$/i,
    label: (match) => `ออกจาก ${match[1]} แล้ว`,
  },
  {
    pattern: /^parcel arrived at (.+)$/i,
    label: (match) => `พัสดุถึง ${match[1]} แล้ว`,
  },
  {
    pattern: /^shipment arrived at (.+)$/i,
    label: (match) => `พัสดุถึง ${match[1]} แล้ว`,
  },
];

function normalizeDetailKey(detail: string): string {
  return detail.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** แปลข้อความรายละเอียดจาก TrackingMore/Kerry เป็นภาษาไทยสำหรับพนักงาน */
export function translateTrackingDetail(detail: string): string {
  const trimmed = detail.trim();
  if (!trimmed) return trimmed;

  const exact = EXACT_TRACKING_DETAIL_LABELS[normalizeDetailKey(trimmed)];
  if (exact) return exact;

  for (const { pattern, label } of TRACKING_DETAIL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    return typeof label === 'function' ? label(match) : label;
  }

  return trimmed;
}
