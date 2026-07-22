import {
  LayoutGrid,
  CalendarRange,
  Wrench,
  Home,
  Package,
  Gauge,
  HandCoins,
  ClipboardList,
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
          active: pathname.includes("/inventory") && !pathname.includes("/inventory/count") && !pathname.includes("/inventory/accuracy") && !pathname.includes("/inventory/branch-withdraw"),
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
          id: 'inventory-accuracy',
          href: `${prefix}/inventory/accuracy`,
          label: "รายงานความแม่นยำ",
          active: pathname.includes("/inventory/accuracy"),
          icon: Gauge,
          submenus: []
        },
        {
          id: 'inventory-branch-withdraw',
          href: `${prefix}/inventory/branch-withdraw`,
          label: 'เบิกของสาขา 2',
          active: pathname.includes('/inventory/branch-withdraw'),
          icon: Package,
          submenus: []
        },
        {
          id: 'sales',
          href: `${prefix}/sales`,
          label: 'จัดการยอดขาย',
          active: pathname.includes('/sales'),
          icon: HandCoins,
          submenus: []
        },
        {
          id: 'bean-orders',
          href: `${prefix}/bean-orders`,
          label: 'คำสั่งซื้อเมล็ดกาแฟ',
          active: pathname.includes('/bean-orders'),
          icon: ClipboardList,
          submenus: []
        },
      ]
    }
  ];
}