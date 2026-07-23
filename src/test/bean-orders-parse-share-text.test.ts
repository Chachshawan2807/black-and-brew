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
    expect(result.address.addressLine).not.toContain('21210');
    expect(result.address.addressLine).not.toContain('ระยอง');
    expect(result.missingFields).toEqual([]);
    expect(isBeanOrderCustomerParseUsable(result)).toBe(true);
  });

  test('normalizes placeholder phone values to empty string', () => {
    const withEmDash = parseBeanOrderCustomerText(`ลูกค้า: คุณเอ\nเบอร์: —\nที่อยู่จัดส่ง: 123 ระยอง 21110`);
    expect(withEmDash.phone).toBe('');

    const withHyphen = parseBeanOrderCustomerText(`ลูกค้า: คุณเอ\nเบอร์: -\nที่อยู่จัดส่ง: 123 ระยอง 21110`);
    expect(withHyphen.phone).toBe('');
  });

  test('parses freeform multi-line text with shop name preserved in address line', () => {
    const result = parseBeanOrderCustomerText(
      `ร้าน Black & Brew สาขาเซ็นทรัล
พ้ง
0809629532
99/5 ป่ายุบใน วังจันทร์ ระยอง 21210`,
    );

    expect(result.parseSource).toBe('rules');
    expect(result.name).toBe('พ้ง');
    expect(result.phone).toBe('0809629532');
    expect(result.address.addressLine).toContain('ร้าน Black & Brew สาขาเซ็นทรัล');
    expect(result.address.addressLine).toContain('99/5');
    expect(result.address.postalCode).toBe('21210');
    expect(isBeanOrderCustomerParseUsable(result)).toBe(true);
  });

  test('keeps unmapped freeform lines in address line without dropping copied text', () => {
    const result = parseBeanOrderCustomerText(
      `หน้าโรงเรียนวัดใหญ่
คุณเอ
0812345678
123 หมู่ 4 ระยอง 21110`,
    );

    expect(result.name).toBe('คุณเอ');
    expect(result.phone).toBe('0812345678');
    expect(result.address.addressLine).toContain('หน้าโรงเรียนวัดใหญ่');
    expect(result.address.addressLine).toContain('123 หมู่ 4');
  });

  test('parses inline freeform LINE text with name, phone, and address', () => {
    const result = parseBeanOrderCustomerText(
      'ส่งเมล็ดกาแฟให้ พ้ง เบอร์ 0809629532 ที่ 99/5 วังจันทร์ ระยอง ครับ',
    );

    expect(result.parseSource).toBe('rules');
    expect(result.name).toBe('พ้ง');
    expect(result.phone).toBe('0809629532');
    expect(result.address.addressLine).toContain('99/5');
    expect(isBeanOrderCustomerParseUsable(result)).toBe(true);
  });

  test('does not merge ERP order metadata into customer address line', () => {
    const result = parseBeanOrderCustomerText(erpShareText);

    expect(result.address.addressLine).not.toContain('ออเดอร์เมล็ดกาแฟ');
    expect(result.address.addressLine).not.toContain('รายการสินค้า');
    expect(result.address.addressLine).not.toContain('ยอดรวม');
    expect(result.address.addressLine).not.toContain('21210');
    expect(result.address.addressLine).not.toContain('ระยอง');
  });

  test('parses ERP address with shop name after postal code', () => {
    const result = parseBeanOrderCustomerText(
      `ลูกค้า: ทัพพ์เทพ นิจนิรันดร์กุล (พัง)
เบอร์: 0809629532
ที่อยู่จัดส่ง: 99/5 หมู่1 ต.ป่ายุบใน อ.วังจันทร์ จ.ระยอง 21210 ร้านบลูเดย์`,
    );

    expect(result.address.postalCode).toBe('21210');
    expect(result.address.subdistrict).toBe('ป่ายุบใน');
    expect(result.address.areaId).toBeTruthy();
    expect(result.address.addressLine).toBe('99/5 หมู่1 ร้านบลูเดย์');
    expect(result.address.addressLine).not.toContain('21210');
    expect(result.address.addressLine).not.toContain('ระยอง');
    expect(result.address.addressLine).not.toContain('ต.');
  });

  test('does not duplicate address line for freeform multi-line paste', () => {
    const result = parseBeanOrderCustomerText(
      `พ้ง
0809629532
99/5 หมู่1 ต.ป่ายุบใน อ.วังจันทร์ จ.ระยอง 21210 ร้านบลูเดย์`,
    );

    expect(result.address.postalCode).toBe('21210');
    expect(result.address.subdistrict).toBe('ป่ายุบใน');
    expect(result.address.addressLine).toBe('99/5 หมู่1 ร้านบลูเดย์');
  });
});
