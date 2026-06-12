"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSidebarToggle, useSidebarHydrated } from "@/hooks/use-sidebar-toggle";
import { Menu } from "lucide-react";
import Image from "next/image";
import {
  FAB_PAGE_BOTTOM_PADDING_CLASS,
  FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS,
} from "@/lib/floating-action-layout";
import { useFloatingOverlay } from "@/components/floating/FloatingOverlayContext";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { fadeOverlay } from "@/lib/motion-presets";

export default function SidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const hydrated = useSidebarHydrated();
  const isOpen = useSidebarToggle((state) => state.isOpen);
  const setIsOpen = useSidebarToggle((state) => state.setIsOpen);
  const { fabStackHidden } = useFloatingOverlay();
  const sidebarOpen = hydrated ? isOpen : true;

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 bg-[var(--sidebar-surface)]/85 backdrop-blur-xl border-b border-black/5 dark:border-white/10 pl-1 pr-3 flex justify-between items-center h-[72px] bb-shadow-sm">
        <div className="flex items-center">
          <Image 
            src="/images/logo.png" 
            alt="BLACK AND BREW" 
            width={200} 
            height={68} 
            className="dark:invert dark:brightness-0 dark:opacity-90"
            style={{ width: '200px', height: '68px', objectFit: 'contain', objectPosition: 'left center' }}
            priority 
          />
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsOpen()}
            className="h-10 w-10 flex items-center justify-center rounded-full bb-transition hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15"
            aria-label="เปิดเมนูนำทาง"
          >
            <Menu className="w-6 h-6 text-foreground" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={fadeOverlay.initial}
            animate={fadeOverlay.animate}
            exit={fadeOverlay.exit}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={() => setIsOpen()}
            className="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <Sidebar />
      <main className={cn(
        "min-h-[100dvh] bg-transparent transition-[margin-left] ease-in-out duration-300",
        fabStackHidden ? FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS : FAB_PAGE_BOTTOM_PADDING_CLASS,
        sidebarOpen === false ? "md:ml-20" : "md:ml-[280px]"
      )}>
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
