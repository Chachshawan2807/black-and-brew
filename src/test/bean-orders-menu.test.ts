import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getMenuList } from '@/lib/menu-list';

describe('bean orders sidebar menu', () => {
  test('includes bean-orders route in management group', () => {
    const menus = getMenuList('/th/bean-orders', 'th').flatMap((g) => g.menus);
    const item = menus.find((m) => m.id === 'bean-orders');
    expect(item).toBeDefined();
    expect(item?.href).toBe('/th/bean-orders');
    expect(item?.label).toBe('คำสั่งซื้อเมล็ดกาแฟ');
    expect(item?.active).toBe(true);
  });

  test('route chunk preload includes bean-orders', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/lib/route-chunk-preload.ts'), 'utf8');
    expect(source).toContain("'bean-orders'");
    expect(source).toContain('BeanOrdersClient');
  });
});
