import {
  LayoutGrid,
  CalendarRange,
  Calendar,
  Wrench,
  Home,
  Package,
  LineChart,
  ClipboardList,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';

export type Submenu = {
  href: string;
  label: string;
  active: boolean;
};

export type MenuItem = {
  id: string;
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
  submenus: Submenu[];
};

export type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

export function getMenuList(pathname: string, locale: string = 'th'): MenuGroup[] {
  const prefix = `/${locale}`;
  return [
    {
      groupLabel: "",
      menus: [
        {
          id: 'home',
          href: `${prefix}`,
          label: "หน้าหลัก",
          active: pathname === `${prefix}` || pathname === `${prefix}/`,
          icon: Home,
          submenus: []
        },
        {
          id: 'dashboard',
          href: `${prefix}/dashboard`,
          label: "แดชบอร์ดพนักงาน",
          active: pathname.includes("/dashboard"),
          icon: LayoutGrid,
          submenus: []
        }
      ]
    },
    {
      groupLabel: "การจัดการ",
      menus: [
        {
          id: 'schedule',
          href: `${prefix}/schedule`,
          label: "ตารางงาน",
          active: pathname.includes("/schedule"),
          icon: CalendarRange,
          submenus: []
        },
        {
          id: 'maintenance',
          href: `${prefix}/maintenance`,
          label: "บันทึกการซ่อม",
          active: pathname.includes("/maintenance"),
          icon: Wrench,
          submenus: []
        },
        {
          id: 'inventory',
          href: `${prefix}/inventory`,
          label: "คลังสินค้า",
          active: pathname.includes("/inventory") && !pathname.includes("/inventory/count"),
          icon: Package,
          submenus: []
        },
        {
          id: 'inventory-count',
          href: `${prefix}/inventory/count`,
          label: "ตรวจนับคลังสินค้า",
          active: pathname.includes("/inventory/count"),
          icon: ClipboardList,
          submenus: []
        },
        {
          id: 'market-insights',
          href: `${prefix}/market-insights`,
          label: 'วิเคราะห์ตลาด',
          active: pathname.includes('/market-insights'),
          icon: LineChart,
          submenus: []
        },
        {
          id: 'sales',
          href: `${prefix}/sales`,
          label: 'จัดการยอดขาย',
          active: pathname.includes('/sales'),
          icon: TrendingUp,
          submenus: []
        },
      ]
    }
  ];
}