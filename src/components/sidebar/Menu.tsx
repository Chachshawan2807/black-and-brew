"use client";

import { usePathname, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { getMenuList } from '@/lib/menu-list';
import { Button } from '@/components/ui/button';
import { CollapseMenuButton } from '@/components/sidebar/CollapseMenuButton';
import { LogOut } from 'lucide-react';
import { clearAuth } from '@/app/actions/auth';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import { useStore } from '@/hooks/use-store';
import { useSidebarToggle } from '@/hooks/use-sidebar-toggle';

interface MenuProps {
  isOpen: boolean | undefined;
}

export default function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'th';
  const menuList = getMenuList(pathname, locale);
  const sidebar = useStore(useSidebarToggle, (state) => state);

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

  const handleLinkClick = () => {
    if (window.innerWidth < 768 && sidebar?.isOpen) {
      sidebar.setIsOpen();
    }
  };

  return (
    <nav className="h-full w-full flex flex-col justify-between overflow-hidden">
      <ul className={cn(
        "flex flex-col gap-1 px-2 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden",
        isOpen === false ? "items-center" : "items-start"
      )}>
        {adjustedMenuList.flatMap(({ menus }) => menus).map(({ href, label, icon: Icon, active, submenus }, menuIndex) =>
          submenus.length === 0 ? (
            <li className="w-full" key={menuIndex}>
              <TooltipProvider disableHoverableContent>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      className={cn(
                        'h-10 font-normal antialiased',
                        isOpen === false ? 'w-10 mx-auto justify-center' : 'w-full justify-start'
                      )}
                      asChild
                    >
                      <Link href={href} onClick={handleLinkClick}>
                        <span className={cn(isOpen === false ? '' : 'mr-4')}>
                          <Icon size={18} />
                        </span>
                        <p
                          className={cn(
                            'max-w-[200px] truncate font-normal transition-all duration-200 ease-in-out',
                            isOpen === false
                              ? '-translate-x-96 opacity-0 hidden'
                              : 'translate-x-0 opacity-100'
                          )}
                        >
                          {label}
                        </p>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {isOpen === false && (
                    <TooltipContent side="right">{label}</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </li>
          ) : (
            <li className="w-full" key={menuIndex}>
              <CollapseMenuButton
                icon={Icon}
                label={label}
                active={active}
                submenus={submenus}
                isOpen={isOpen}
                onLinkClick={handleLinkClick}
              />
            </li>
          )
        )}
      </ul>

      {/* Logout Button */}
      <div className="w-full px-2 pt-4 pb-2 max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t border-black/5 mt-auto">
        <TooltipProvider disableHoverableContent>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                onClick={async () => {
                  await clearAuth();
                  sessionStorage.removeItem('bb_auth_pin_verified');
                  sessionStorage.removeItem('bb_auth_read_only');
                  window.location.reload();
                }}
                variant="ghost"
                className={cn(
                  'h-10 text-red-500 hover:text-red-600 hover:bg-red-50 font-normal antialiased w-full',
                  isOpen === false ? 'justify-center px-0' : 'justify-start'
                )}
              >
                <span className={cn(isOpen === false ? '' : 'mr-4')}>
                  <LogOut size={18} />
                </span>
                <p
                  className={cn(
                    'max-w-[200px] truncate font-normal',
                    isOpen === false
                      ? '-translate-x-96 opacity-0 hidden'
                      : 'translate-x-0 opacity-100'
                  )}
                >
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
