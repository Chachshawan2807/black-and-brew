"use client";




import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";

import Menu from "@/components/sidebar/Menu";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/sidebar/SidebarToggle";

export function Sidebar() {
  const sidebar = useStore(useSidebarToggle, (state) => state);


  const isOpen = sidebar?.isOpen ?? true;

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-[100] h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300 bg-white border-r border-gray-200 shadow-sm',
        isOpen === false ? 'w-16' : 'w-fit max-w-[260px]'
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={sidebar?.setIsOpen} />
      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto overflow-x-hidden">

        <Menu isOpen={sidebar?.isOpen} />
      </div>
    </aside>
  );
}
