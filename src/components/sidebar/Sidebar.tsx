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
        'fixed top-0 left-0 z-[100] h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300 bg-transparent border-none',
        isOpen === false ? 'w-20' : 'w-fit max-w-[280px]'
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={sidebar?.setIsOpen} />
      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto overflow-x-hidden">
        <div className={cn(
          "mb-2 flex items-center transition-all duration-500",
          isOpen === false ? "justify-center" : "justify-start px-2"
        )}>
          <div className="relative z-[110]">
            <Image 
              src="/images/logo.png" 
              alt="Logo" 
              width={isOpen === false ? 40 : 160} 
              height={isOpen === false ? 40 : 64} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>
        </div>
        <Menu isOpen={sidebar?.isOpen} />
      </div>
    </aside>
  );
}
