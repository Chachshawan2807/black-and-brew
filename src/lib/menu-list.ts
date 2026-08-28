import {
  LayoutGrid,
  CalendarRange,
  Wrench,
  Home,
  Package,
  Truck,
  Gauge,
  ClipboardList,
  Coffee,
  ClipboardCheck,
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
  badgeCount?: number;
};

export type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

export function getMenuList(pathname: string, locale: string = 'th', opts?: { secretaryPendingCount?: number }): MenuGroup[] {
  const prefix = `/${locale}`;
  const secretaryPendingCount = opts?.secretaryPendingCount ?? 0;
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
          id: 'secretary',
          href: `${prefix}/secretary`,
          label: "เลขาส่วนตัว",
          active: pathname.includes('/secretary'),
          icon: ClipboardCheck,
          submenus: [],
          badgeCount: secretaryPendingCount > 0 ? secretaryPendingCount : undefined,
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
          icon: Truck,
          submenus: []
        },
        {
          id: 'bean-orders',
          href: `${prefix}/bean-orders`,
          label: 'ออเดอร์เมล็ดกาแฟ',
          active: pathname.includes('/bean-orders'),
          icon: Coffee,
          submenus: []
        },
      ]
    }
  ];
}