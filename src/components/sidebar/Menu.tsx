"use client";


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
          "flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] gap-8 px-2",
          isOpen === false ? "items-center" : "items-start"
        )}>
          {menuList.flatMap(({ menus }) => menus).map(({ href, label, icon: Icon, active, submenus }, menuIndex) =>
            submenus.length === 0 ? (
              <li className="w-full" key={menuIndex}>
                <TooltipProvider disableHoverableContent>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={active ? 'secondary' : 'ghost'}
                        className={cn(
                          'h-10',
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
              </li>
            ) : (
              <li className="w-full" key={menuIndex}>
                <CollapseMenuButton
                  icon={Icon}
                  label={label}
                  active={active}
                  submenus={submenus}
                  isOpen={isOpen}
                />
              </li>
            )
          )}
        </ul>
      </nav>
    </ScrollArea>
  );
}
