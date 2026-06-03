"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { Menu } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function SidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const isOpen = sidebar?.isOpen ?? true;

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 pl-1 pr-3 flex justify-between items-center h-[72px]">
        <div className="flex items-center">
          <Image 
            src="/images/logo.png" 
            alt="BLACK AND BREW" 
            width={200} 
            height={68} 
            style={{ width: '200px', height: '68px', objectFit: 'contain', objectPosition: 'left center' }}
            priority 
          />
        </div>
        <button 
          onClick={() => sidebar?.setIsOpen?.()}
          className="h-10 w-10 flex items-center justify-center rounded-full active:bg-black/5 transition-colors"
        >
          <Menu className="w-6 h-6 text-black" />
        </button>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => sidebar?.setIsOpen?.()}
            className="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

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
