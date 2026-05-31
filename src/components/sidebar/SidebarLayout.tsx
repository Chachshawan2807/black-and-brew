"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { Menu } from "lucide-react";
import Image from "next/image";

export default function SidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const isOpen = sidebar?.isOpen ?? true;

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-4 py-3 flex justify-between items-center">
        <div className="relative h-8 w-32">
          <Image src="/images/logo.png" alt="Logo" fill className="object-contain object-left" priority />
        </div>
        <button 
          onClick={() => sidebar?.setIsOpen?.()}
          className="h-11 w-11 flex items-center justify-center rounded-3xl active:bg-black/5 transition-colors"
        >
          <Menu className="w-6 h-6 text-black" />
        </button>
      </header>

      <Sidebar />
      <main className={cn(
        "min-h-screen bg-transparent transition-[margin-left] ease-in-out duration-300",
        isOpen === false ? "md:ml-20" : "md:ml-[280px]"
      )}>
        {children}
      </main>
    </>
  );
}
