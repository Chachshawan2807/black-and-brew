"use client";




import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";

import Menu from "@/components/sidebar/Menu";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/sidebar/SidebarToggle";
import Image from "next/image";

export function Sidebar() {
  const sidebar = useStore(useSidebarToggle, (state) => state);


  const isOpen = sidebar?.isOpen ?? true;

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-[100] h-[100dvh] text-foreground transition-transform duration-300 ease-in-out md:transition-[width] md:duration-300 md:ease-in-out bg-[var(--sidebar-surface)] md:bg-transparent border-none bb-shadow-lg md:shadow-none md:border-r md:border-black/5 dark:md:border-white/10 md:flex',
        isOpen === false 
          ? '-translate-x-full md:translate-x-0 md:w-20' 
          : 'translate-x-0 w-[280px] max-w-[85vw] md:w-fit md:max-w-[280px]'
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={sidebar?.setIsOpen} />
      <div className="relative h-full flex flex-col pl-2 pr-3 py-4 overflow-hidden">
        <div className={cn(
          "mb-4 flex items-center transition-all duration-500",
          isOpen === false ? "justify-center" : "justify-start"
        )}>
          <div className="relative z-[110]">
            {isOpen === false ? (
              <Image 
                src="/images/logo.png" 
                alt="BLACK AND BREW" 
                width={56} 
                height={56} 
                className="dark:invert dark:brightness-0 dark:opacity-90"
                style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                priority
              />
            ) : (
              <Image 
                src="/images/logo.png" 
                alt="BLACK AND BREW" 
                width={240} 
                height={90} 
                className="dark:invert dark:brightness-0 dark:opacity-90"
                style={{ width: '240px', height: '90px', objectFit: 'contain', objectPosition: 'left center' }}
                priority
              />
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Menu isOpen={sidebar?.isOpen} />
        </div>
      </div>
    </aside>
  );
}
