import { describe, expect, test } from 'vitest';
import { translateTrackingDetail } from '@/lib/bean-orders/tracking-detail-labels';

describe('translateTrackingDetail', () => {
  test('translates common Kerry/TrackingMore messages', () => {
    expect(translateTrackingDetail('Successfully delivered')).toBe('จัดส่งสำเร็จ');
    expect(translateTrackingDetail('Courier has contacted the recipient')).toBe('พนักงานติดต่อผู้รับแล้ว');
    expect(translateTrackingDetail('Out for delivery')).toBe('กำลังนำจ่ายพัสดุ');
    expect(translateTrackingDetail('Arrived at the destination station')).toBe('ถึงสาขาปลายทางแล้ว');
    expect(translateTrackingDetail('Departed from Distribution center')).toBe('ออกจากศูนย์กระจายสินค้าแล้ว');
    expect(translateTrackingDetail('Arrived at Distribution center')).toBe('ถึงศูนย์กระจายสินค้าแล้ว');
    expect(translateTrackingDetail('Your parcel has been dropped at KEX service point')).toBe(
      'ฝากพัสดุที่จุดบริการ KEX แล้ว',
    );
  });

  test('translates delivery schedule pattern', () => {
    expect(
      translateTrackingDetail('Your parcel will be delivered by July 23, 2026'),
    ).toBe('คาดว่าจะจัดส่งภายใน July 23, 2026');
  });
});
