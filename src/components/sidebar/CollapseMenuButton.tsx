"use client";

import { useState } from "react";
import { ChevronDown, Dot, type LucideIcon } from "lucide-react";
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";
import { sidebarLabelClass } from "@/lib/sidebar-label-classes";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

type Submenu = {
  href: string;
  label: string;
  active: boolean;
};

interface CollapseMenuButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  submenus: Submenu[];
  isOpen: boolean | undefined;
  onLinkClick?: () => void;
}

export function CollapseMenuButton({
  icon: Icon,
  label,
  active,
  submenus,
  isOpen,
  onLinkClick
}: CollapseMenuButtonProps) {
  const isSubmenuActive = submenus.some((submenu) => submenu.active);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive);

  return isOpen ? (
    <Collapsible
      open={isCollapsed}
      onOpenChange={setIsCollapsed}
      className="w-full"
    >
      <CollapsibleTrigger
        className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1"
        asChild
      >
        <Button
          variant={active ? "secondary" : "ghost"}
          className="w-full justify-start h-10"
        >
          <div className="w-full items-center flex justify-between">
            <div className="flex items-center">
              <span className="mr-4 text-foreground">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <p className={sidebarLabelClass(isOpen, "max-w-[150px] text-foreground")}>
                {label}
              </p>
            </div>
            <div
              className={cn(
                "whitespace-nowrap bb-sidebar-label",
                isOpen
                  ? "bb-sidebar-label--expanded"
                  : "bb-sidebar-label--collapsed"
              )}
            >
              <ChevronDown
                size={18}
                strokeWidth={1.75}
                className="text-foreground transition-transform duration-200"
              />
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {submenus.map(({ href, label, active }, index) => (
          <Button
            key={index}
            variant={active ? "secondary" : "ghost"}
            className="w-full justify-start h-10 mb-1"
            asChild
          >
            <Link href={href} onClick={onLinkClick}>
              <span className="mr-4 ml-2 text-foreground">
                <Dot size={18} strokeWidth={1.75} />
              </span>
              <p className={sidebarLabelClass(isOpen, "max-w-[170px] text-foreground")}>
                {label}
              </p>
            </Link>
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ) : (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "mb-1 h-10",
                  isOpen === false ? "w-10 mx-auto justify-center" : "w-full justify-start"
                )}
              >
                <div className="w-full items-center flex justify-between">
                  <div className="flex items-center">
                    <span className={cn("text-foreground", isOpen === false ? "" : "mr-4")}>
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <p className={sidebarLabelClass(isOpen, "text-foreground")}>
                      {label}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" alignOffset={2}>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="right" sideOffset={25} align="start">
        <DropdownMenuLabel className="max-w-[190px] truncate">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {submenus.map(({ href, label }, index) => (
          <DropdownMenuItem key={index} asChild>
            <Link className="cursor-pointer" href={href} onClick={onLinkClick}>
              <p className="max-w-[180px] truncate">{label}</p>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuArrow className="fill-gray-200" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
