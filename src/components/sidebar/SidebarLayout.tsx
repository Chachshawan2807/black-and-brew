"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { Menu } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { fadeOverlay } from "@/lib/motion-presets";

export default function SidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const isOpen = sidebar?.isOpen ?? true;

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-black/5 pl-1 pr-3 flex justify-between items-center h-[72px] bb-shadow-sm">
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
          className="h-10 w-10 flex items-center justify-center rounded-full bb-transition hover:bg-black/5 active:bg-black/10"
          aria-label="เปิดเมนูนำทาง"
        >
          <Menu className="w-6 h-6 text-black" />
        </button>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={fadeOverlay.initial}
            animate={fadeOverlay.animate}
            exit={fadeOverlay.exit}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={() => sidebar?.setIsOpen?.()}
            className="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <Sidebar />
      <main className={cn(
        "min-h-[100dvh] bg-transparent transition-[margin-left] ease-in-out duration-300",
        isOpen === false ? "md:ml-20" : "md:ml-[280px]"
      )}>
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
