"use client";




import { cn } from "@/lib/utils";
import Menu from "@/components/sidebar/Menu";
import { useSidebarToggle, useSidebarHydrated } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/sidebar/SidebarToggle";
import Image from "next/image";

export function Sidebar() {
  const hydrated = useSidebarHydrated();
  const isOpen = useSidebarToggle((state) => state.isOpen);
  const setIsOpen = useSidebarToggle((state) => state.setIsOpen);
  const sidebarOpen = hydrated ? isOpen : true;

  return (
    <aside
      id="bb-nav-drawer"
      className={cn(
        'bb-mobile-drawer-surface fixed top-0 left-0 z-[100] h-[100svh] text-foreground transition-transform duration-300 ease-in-out motion-reduce:transition-none md:transition-[width] md:duration-300 md:ease-in-out bg-[var(--sidebar-surface)] md:bg-transparent border-none bb-shadow-lg md:shadow-none md:border-r md:border-black/5 dark:md:border-white/10 md:flex',
        sidebarOpen === false 
          ? '-translate-x-full md:translate-x-0 md:w-20' 
          : 'translate-x-0 w-[min(280px,80dvw)] md:w-fit md:max-w-[280px]'
      )}
    >
      <SidebarToggle isOpen={sidebarOpen} setIsOpen={setIsOpen} />
      <div className="relative h-full flex flex-col pl-2 pr-3 py-4 overflow-hidden">
        <div className={cn(
          "mb-4 flex items-center transition-all duration-500",
          sidebarOpen === false ? "justify-center" : "justify-between gap-2"
        )}>
          <div className="relative z-[110] min-w-0">
            {sidebarOpen === false ? (
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
          <Menu isOpen={sidebarOpen} />
        </div>
      </div>
    </aside>
  );
}
