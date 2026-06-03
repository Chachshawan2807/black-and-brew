import {
  LayoutGrid,
  CalendarRange,
  Calendar,
  Wrench,
  Home,
  Package,
  LineChart,
  ClipboardList,
  type LucideIcon
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active: boolean;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
  submenus: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string, locale: string = 'th'): Group[] {
  const prefix = `/${locale}`;
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: `${prefix}`,
          label: "หน้าหลัก",
          active: pathname === `${prefix}` || pathname === `${prefix}/`,
          icon: Home,
          submenus: []
        },
        {
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
          href: `${prefix}/schedule`,
          label: "ตารางงาน",
          active: pathname.includes("/schedule"),
          icon: CalendarRange,
          submenus: []
        },
        {
          href: `${prefix}/maintenance`,
          label: "บันทึกการซ่อม",
          active: pathname.includes("/maintenance"),
          icon: Wrench,
          submenus: []
        },
        {
          href: `${prefix}/inventory`,
          label: "คลังสินค้า",
          active: pathname.includes("/inventory") && !pathname.includes("/inventory/count"),
          icon: Package,
          submenus: []
        },
        {
          href: `${prefix}/inventory/count`,
          label: "ตรวจนับคลังสินค้า",
          active: pathname.includes("/inventory/count"),
          icon: ClipboardList,
          submenus: []
        },
        {
          href: `${prefix}/market-insights`,
          label: "วิเคราะห์ตลาด",
          active: pathname.includes("/market-insights"),
          icon: LineChart,
          submenus: []
        },
      ]
    }
  ];
}