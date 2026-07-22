import { describe, expect, test } from 'vitest';
import {
  isBeanOrderCustomerParseUsable,
  parseBeanOrderCustomerText,
} from '@/lib/bean-orders/parse-share-text';

const erpShareText = `ออเดอร์เมล็ดกาแฟ
วันที่: 22 กรกฎาคม 2569 เวลา 19:08
สถานะ: รอชำระ

ลูกค้า: ทัพพ์เทพ นิจนิรันดร์กุล (พ้ง)
เบอร์: 0809629532
ที่อยู่จัดส่ง: 99/5 ป่ายุบใน วังจันทร์ ระยอง 21210

รายการสินค้า:
1) เมล็ดกาแฟคั่วเข้ม / 10 กก. / 550 บาท/กก. / รวม 5,500 บาท

รวมสินค้า: 5,500 บาท
ส่วนลด: 0 บาท
ค่าจัดส่ง: 150 บาท
ยอดรวม: 5,650 บาท

การจัดส่ง: ยังไม่บันทึกจัดส่ง

หมายเหตุ: -`;

describe('parseBeanOrderCustomerText', () => {
  test('parses customer name, phone, and address from ERP share text', () => {
    const result = parseBeanOrderCustomerText(erpShareText);

    expect(result.parseSource).toBe('rules');
    expect(result.name).toBe('ทัพพ์เทพ นิจนิรันดร์กุล (พ้ง)');
    expect(result.phone).toBe('0809629532');
    expect(result.address.postalCode).toBe('21210');
    expect(result.address.province).toBe('ระยอง');
    expect(result.address.addressLine).toContain('99/5');
    expect(result.missingFields).toEqual([]);
    expect(isBeanOrderCustomerParseUsable(result)).toBe(true);
  });

  test('normalizes placeholder phone values to empty string', () => {
    const withEmDash = parseBeanOrderCustomerText(`ลูกค้า: คุณเอ\nเบอร์: —\nที่อยู่จัดส่ง: 123 ระยอง 21110`);
    expect(withEmDash.phone).toBe('');

    const withHyphen = parseBeanOrderCustomerText(`ลูกค้า: คุณเอ\nเบอร์: -\nที่อยู่จัดส่ง: 123 ระยอง 21110`);
    expect(withHyphen.phone).toBe('');
  });

  test('marks freeform LINE text as not usable by rules', () => {
    const result = parseBeanOrderCustomerText(
      'ส่งเมล็ดกาแฟให้ พ้ง เบอร์ 0809629532 ที่ 99/5 วังจันทร์ ระยอง ครับ',
    );

    expect(result.parseSource).toBe('rules');
    expect(isBeanOrderCustomerParseUsable(result)).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });
});
