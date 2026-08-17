import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getSalesCategoryCancelAriaLabel,
  getSalesCategoryCellAriaLabel,
  getSalesCategoryEditButtonAriaLabel,
  getSalesCategoryInputName,
  getSalesCategorySaveAriaLabel,
} from '@/lib/sales-category-cell-a11y';

const salesClientPath = path.resolve(__dirname, '../app/[locale]/sales/SalesClient.tsx');

describe('sales category cell a11y helpers', () => {
  test('builds Thai aria labels for category editing', () => {
    expect(getSalesCategoryCellAriaLabel('ลาเต้')).toBe('หมวดหมู่ ลาเต้');
    expect(getSalesCategoryEditButtonAriaLabel('ลาเต้', 'เครื่องดื่ม')).toBe(
      'แก้ไขหมวดหมู่ ลาเต้ (เครื่องดื่ม)',
    );
    expect(getSalesCategoryEditButtonAriaLabel('ลาเต้', '')).toBe(
      'แก้ไขหมวดหมู่ ลาเต้ (ยังไม่ระบุ)',
    );
    expect(getSalesCategorySaveAriaLabel('ลาเต้')).toBe('บันทึกหมวดหมู่ ลาเต้');
    expect(getSalesCategoryCancelAriaLabel('ลาเต้')).toBe('ยกเลิกแก้ไขหมวดหมู่ ลาเต้');
  });

  test('builds stable input name from product name', () => {
    expect(getSalesCategoryInputName('ลาเต้')).toBe('sales-category-ลาเต้');
  });

  test('SalesClient wires category a11y helpers into inline edits', () => {
    const source = fs.readFileSync(salesClientPath, 'utf-8');

    expect(source).toContain("from '@/lib/sales-category-cell-a11y'");
    expect(source).toContain('getSalesCategoryCellAriaLabel');
    expect(source).toContain('getSalesCategoryInputName');
    expect(source).not.toContain('Edit category for');
  });
});
