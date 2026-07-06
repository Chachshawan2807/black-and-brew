"use client";

import { usePathname, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { GripVertical, LogOut, Settings2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { sidebarLabelClass } from '@/lib/sidebar-label-classes';
import { getMenuList, type MenuItem } from '@/lib/menu-list';
import { Button } from '@/components/ui/button';
import { CollapseMenuButton } from '@/components/sidebar/CollapseMenuButton';
import SidebarThemeToggle from '@/components/sidebar/SidebarThemeToggle';
import { performClientLogout } from '@/lib/logout-client';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import { useSidebarToggle, useSidebarHydrated } from '@/hooks/use-sidebar-toggle';
import { useReadOnly } from '@/components/providers/AuthProvider';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSafeDndSensors } from '@/lib/dnd-sensors';
import { CSS } from '@dnd-kit/utilities';
import { useMobileNavDrawer } from '@/hooks/use-mobile-nav-drawer';

const STORAGE_KEY = 'sidebar-menu-order';

interface MenuProps {
  isOpen: boolean | undefined;
}

// ─── Static menu item (used as DragOverlay ghost + non-admin fallback) ───────

function StaticMenuItem({
  menu,
  isOpen,
  onLinkClick,
  isOverlay = false,
}: {
  menu: MenuItem;
  isOpen: boolean | undefined;
  onLinkClick: () => void;
  isOverlay?: boolean;
}) {
  const { href, label, icon: Icon, active, submenus } = menu;

  if (submenus.length > 0) {
    return (
      <li className="w-full">
        <CollapseMenuButton
          icon={Icon}
          label={label}
          active={active}
          submenus={submenus}
          isOpen={isOpen}
          onLinkClick={onLinkClick}
        />
      </li>
    );
  }

  return (
    <li className={cn("w-full flex items-center", isOverlay && "opacity-80 shadow-lg rounded-lg bg-card")}>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'h-10 font-normal antialiased flex-1',
                isOpen === false ? 'w-10 mx-auto justify-center' : 'w-full justify-start'
              )}
              asChild
            >
              <Link href={href} onClick={onLinkClick}>
                <span className={cn("text-foreground", isOpen === false ? '' : 'mr-4')}>
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <p className={sidebarLabelClass(isOpen, 'text-foreground')}>
                  {label}
                </p>
              </Link>
            </Button>
          </TooltipTrigger>
          {isOpen === false && <TooltipContent side="right">{label}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    </li>
  );
}

// ─── Sortable menu item (admin + sidebar open only) ───────────────────────────

function SortableMenuItem({
  menu,
  isOpen,
  onLinkClick,
}: {
  menu: MenuItem;
  isOpen: boolean | undefined;
  onLinkClick: () => void;
}) {
  const { href, label, icon: Icon, active, submenus } = menu;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: menu.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition ?? undefined),
    opacity: isDragging ? 0.3 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  if (submenus.length > 0) {
    return (
      <li ref={setNodeRef} style={style} {...attributes} className="w-full flex items-center group/menuitem">
        <div className="flex-1 min-w-0">
          <CollapseMenuButton
            icon={Icon}
            label={label}
            active={active}
            submenus={submenus}
            isOpen={isOpen}
            onLinkClick={onLinkClick}
          />
        </div>
        <div
          className="flex-shrink-0 h-10 w-6 flex items-center justify-center opacity-0 group-hover/menuitem:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          {...listeners}
          aria-label="ลากเพื่อเปลี่ยนลำดับ"
        >
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} {...attributes} className="w-full flex items-center group/menuitem">
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              variant={active ? 'secondary' : 'ghost'}
              className="h-10 font-normal antialiased flex-1 justify-start"
              asChild
            >
              <Link href={href} onClick={onLinkClick}>
                <span className="mr-4 text-foreground">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <p className={sidebarLabelClass(isOpen, 'max-w-[170px] text-foreground')}>
                  {label}
                </p>
              </Link>
            </Button>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>

      {/* Drag handle — scoped listeners prevent scroll hijack */}
      <div
        className="flex-shrink-0 h-10 w-6 flex items-center justify-center opacity-0 group-hover/menuitem:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        {...listeners}
        aria-label="ลากเพื่อเปลี่ยนลำดับ"
      >
        <GripVertical size={14} className="text-muted-foreground" />
      </div>
    </li>
  );
}

// ─── Main Menu component ──────────────────────────────────────────────────────

export default function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'th';

  const hydrated = useSidebarHydrated();
  const sidebarIsOpen = useSidebarToggle((state) => state.isOpen);
  const closeMobileDrawer = useMobileNavDrawer((state) => state.closeDrawer);
  const sidebarOpen = hydrated ? sidebarIsOpen : true;
  const isReadOnly = useReadOnly();
  const isAdmin = !isReadOnly;

  const [isMounted, setIsMounted] = useState(false);
  const [customOrderIds, setCustomOrderIds] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSafeDndSensors();

  // Build menu from pathname (active state always fresh)
  const menuList = getMenuList(pathname, locale);
  const showHolidays = searchParams?.get('showRegularHolidays') === 'true';

  const adjustedMenuList = menuList.map(group => ({
    ...group,
    menus: group.menus.map(menu => {
      if (menu.href.includes('showRegularHolidays')) {
        return { ...menu, active: pathname.includes('/schedule') && showHolidays };
      }
      if (menu.href.endsWith('/schedule')) {
        return { ...menu, active: pathname.includes('/schedule') && !showHolidays };
      }
      return menu;
    })
  }));

  const flatMenus = adjustedMenuList.flatMap(({ menus }) => menus);

  // Apply saved order to fresh menu items (so active state is always current)
  const displayMenus = useMemo(() => {
    if (!customOrderIds) return flatMenus;
    const reordered = customOrderIds
      .map(id => flatMenus.find(m => m.id === id))
      .filter(Boolean) as MenuItem[];
    const missing = flatMenus.filter(m => !customOrderIds.includes(m.id));
    return [...reordered, ...missing];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customOrderIds, pathname, showHolidays]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        if (Array.isArray(ids) && ids.length > 0) {
          setCustomOrderIds(ids);
        }
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      closeMobileDrawer();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setCustomOrderIds(prev => {
      const currentIds = prev ?? displayMenus.map(m => m.id);
      const oldIdx = currentIds.indexOf(active.id as string);
      const newIdx = currentIds.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const newOrder = arrayMove(currentIds, oldIdx, newIdx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
  };

  const isDragEnabled = isMounted && isAdmin && isOpen !== false;

  const activeMenu = activeId ? displayMenus.find(m => m.id === activeId) : null;

  return (
    <nav className="h-full w-full flex flex-col justify-between overflow-hidden">
      <ul className={cn(
        "flex flex-col gap-1 px-2 overflow-y-auto bb-smooth-scroll scrollbar-none [&::-webkit-scrollbar]:hidden",
        isOpen === false ? "items-center" : "items-start"
      )}>
        {isDragEnabled ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayMenus.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {displayMenus.map(menu => (
                <SortableMenuItem
                  key={menu.id}
                  menu={menu}
                  isOpen={isOpen}
                  onLinkClick={handleLinkClick}
                />
              ))}
            </SortableContext>

            <DragOverlay dropAnimation={{
              duration: 200,
              easing: 'ease-in-out',
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: '0.3' } },
              }),
            }}>
              {activeMenu ? (
                <StaticMenuItem
                  menu={activeMenu}
                  isOpen={isOpen}
                  onLinkClick={() => {}}
                  isOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          displayMenus.map((menu, i) => (
            <StaticMenuItem
              key={menu.id ?? i}
              menu={menu}
              isOpen={isOpen}
              onLinkClick={handleLinkClick}
            />
          ))
        )}
      </ul>

      {/* Theme, Settings & Logout */}
      <div className={cn(
        "w-full px-2 pt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t border-black/5 dark:border-white/10 mt-auto space-y-2",
        isOpen === false && "overflow-hidden"
      )}>
        <SidebarThemeToggle locale={locale} isOpen={isOpen} />
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                variant={pathname.includes('/settings') ? 'secondary' : 'ghost'}
                className={cn(
                  'h-10 font-normal antialiased text-foreground w-full',
                  isOpen === false ? 'justify-center px-0 w-10 mx-auto' : 'justify-start'
                )}
                asChild
              >
                <Link href={`/${locale}/settings`} onClick={handleLinkClick}>
                  <span className={cn(isOpen === false ? '' : 'mr-4')}>
                    <Settings2 size={18} strokeWidth={1.75} />
                  </span>
                  <p className={sidebarLabelClass(isOpen, 'text-foreground')}>
                    {locale === 'th' ? 'ตั้งค่า' : 'Settings'}
                  </p>
                </Link>
              </Button>
            </TooltipTrigger>
            {isOpen === false && (
              <TooltipContent side="right">
                {locale === 'th' ? 'ตั้งค่า' : 'Settings'}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => void performClientLogout()}
                variant="ghost"
                className={cn(
                  'h-10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-normal antialiased w-full',
                  isOpen === false ? 'justify-center px-0' : 'justify-start'
                )}
              >
                <span className={cn(isOpen === false ? '' : 'mr-4')}>
                  <LogOut size={18} strokeWidth={1.75} />
                </span>
                <p className={sidebarLabelClass(isOpen, 'text-red-500')}>
                  {locale === 'th' ? 'ออกจากระบบ' : 'Logout'}
                </p>
              </Button>
            </TooltipTrigger>
            {isOpen === false && (
              <TooltipContent side="right">
                {locale === 'th' ? 'ออกจากระบบ' : 'Logout'}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </nav>
  );
}
