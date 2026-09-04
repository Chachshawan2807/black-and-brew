import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isSidebarMenuLabel,
  shouldShowPageTitle,
  SIDEBAR_MENU_LABELS,
} from '@/lib/sidebar-menu-labels';

const ROOT = path.resolve(__dirname, '..');

describe('sidebar duplicate page titles', () => {
  test('matches exact sidebar labels', () => {
    expect(isSidebarMenuLabel('เบิกของสาขา 2')).toBe(true);
    expect(isSidebarMenuLabel('งาน')).toBe(true);
    expect(isSidebarMenuLabel('ออเดอร์เมล็ดกาแฟ')).toBe(true);
    expect(shouldShowPageTitle('คลังสินค้า')).toBe(false);
  });

  test('keeps task-specific titles', () => {
    expect(shouldShowPageTitle('ตรวจตารางงาน')).toBe(true);
    expect(shouldShowPageTitle('รายการสั่งซื้อ')).toBe(true);
    expect(shouldShowPageTitle('ตั้งค่า')).toBe(true);
    expect(shouldShowPageTitle('เบิกของสาขา 2 (8 รายการ)')).toBe(true);
  });

  test('sidebar labels stay in sync with menu-list', () => {
    const menu = fs.readFileSync(path.resolve(ROOT, 'lib/menu-list.ts'), 'utf-8');
    for (const label of SIDEBAR_MENU_LABELS) {
      expect(menu).toContain(label);
    }
  });

  test('PageHeader hides duplicate sidebar titles', () => {
    const header = fs.readFileSync(path.resolve(ROOT, 'components/ui/page-header.tsx'), 'utf-8');
    expect(header).toContain('shouldShowPageTitle');
    expect(header).toContain('showTitle');
  });

  test('major routes omit duplicate in-page titles', () => {
    const inventory = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    const schedule = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/schedule/_components/ScheduleToolbar.tsx'),
      'utf-8',
    );
    const accuracy = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/accuracy/page.tsx'),
      'utf-8',
    );
    const beanForm = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/bean-orders/BeanOrderFormClient.tsx'),
      'utf-8',
    );
    const secretary = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/SecretaryClient.tsx'),
      'utf-8',
    );

    expect(inventory).toContain('shouldShowPageTitle');
    expect(schedule).toContain('shouldShowPageTitle');
    expect(accuracy).toContain('PageTitle');
    expect(beanForm).toContain('PageTitle');
    expect(secretary).not.toContain('title="งาน"');
  });

  test('secretary overlays hide duplicate sidebar titles', () => {
    const panelShell = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskPanelShell.tsx'),
      'utf-8',
    );
    const listOverlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskListOverlay.tsx'),
      'utf-8',
    );

    expect(panelShell).toContain('isSidebarMenuLabel');
    expect(panelShell).toContain('hasVisibleHeader');
    expect(panelShell).toMatch(/hasVisibleHeader[\s\S]*absolute right-3 top-3/);
    expect(listOverlay).toContain('SecretaryTaskPanelShell');
  });
});
