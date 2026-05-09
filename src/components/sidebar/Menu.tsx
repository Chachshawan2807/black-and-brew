"use client";

import { Ellipsis } from 'lucide-react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { getMenuList } from '@/lib/menu-list';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CollapseMenuButton } from '@/components/sidebar/CollapseMenuButton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';

interface MenuProps {
  isOpen: boolean | undefined;
}

export default function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const menuList = getMenuList(pathname, locale);

  return (
    <ScrollArea className="[&>div>div[style]]:!block">
      <nav className={cn('mt-8 h-full w-full')}>
        <ul className={cn(
          "flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] space-y-1 px-2",
          isOpen === false ? "items-center" : "items-start"
        )}>
          {menuList.map(({ groupLabel, menus }, index) => (
            <li className={cn('w-full', groupLabel ? 'pt-5' : '')} key={index}>
              {(isOpen && groupLabel) || isOpen === undefined ? (
                <p className="text-sm font-normal text-gray-400 px-4 pb-2 max-w-[248px] truncate">
                  {groupLabel}
                </p>
              ) : !isOpen && isOpen !== undefined && groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="w-full flex justify-center items-center">
                        <Ellipsis className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"></p>
              )}
              {menus.map(({ href, label, icon: Icon, active, submenus }, menuIndex) =>
                submenus.length === 0 ? (
                  <div className="w-full" key={menuIndex}>
                    <TooltipProvider disableHoverableContent>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={active ? 'secondary' : 'ghost'}
                            className={cn(
                              'mb-1 h-10',
                              isOpen === false ? 'w-10 mx-auto justify-center' : 'w-full justify-start'
                            )}
                            asChild
                          >
                            <Link href={href}>
                              <span className={cn(isOpen === false ? '' : 'mr-4')}>
                                <Icon size={18} />
                              </span>
                              <p
                                className={cn(
                                  'max-w-[200px] truncate',
                                  isOpen === false
                                    ? '-translate-x-96 opacity-0'
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
                  </div>
                ) : (
                  <div className="w-full" key={menuIndex}>
                    <CollapseMenuButton
                      icon={Icon}
                      label={label}
                      active={active}
                      submenus={submenus}
                      isOpen={isOpen}
                    />
                  </div>
                )
              )}
            </li>
          ))}

        </ul>
      </nav>
    </ScrollArea>
  );
}
