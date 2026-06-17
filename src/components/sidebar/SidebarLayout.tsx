"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSidebarToggle, useSidebarHydrated } from "@/hooks/use-sidebar-toggle";
import { useMobileNavDrawerInert } from "@/hooks/use-mobile-nav-drawer-inert";
import { Menu } from "lucide-react";
import Image from "next/image";
import {
  FAB_PAGE_BOTTOM_PADDING_CLASS,
  FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS,
} from "@/lib/floating-action-layout";
import { useFloatingOverlay } from "@/components/floating/FloatingOverlayContext";
import { PageTransition } from "@/components/ui/page-transition";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { useEffect } from "react";

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
  const mobileDrawerInert = useMobileNavDrawerInert(sidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, setIsOpen]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 bg-[var(--sidebar-surface)] border-b border-black/5 dark:border-white/10 pl-1 pr-3 flex justify-between items-center h-[72px] bb-shadow-sm">
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
          <HintTooltip tip="เปิดเมนูนำทาง" side="bottom">
            <button 
              type="button"
              onClick={() => setIsOpen()}
              className="h-10 w-10 flex items-center justify-center rounded-full bb-transition hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15"
              aria-label="เปิดเมนูนำทาง"
              aria-expanded={sidebarOpen}
              aria-controls="bb-nav-drawer"
            >
              <Menu className="w-6 h-6 text-foreground" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </HintTooltip>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="ปิดเมนูนำทาง"
          onClick={() => setIsOpen()}
          className="md:hidden fixed inset-0 z-[90] bg-black/40 motion-reduce:transition-none transition-opacity duration-300 ease-in-out"
        />
      )}

      <Sidebar />
      <main
        id="app-main"
        inert={mobileDrawerInert ? true : undefined}
        className={cn(
          "bb-main-container min-h-[100svh] bg-transparent transition-[margin-left] ease-in-out duration-300 motion-reduce:transition-none",
          fabStackHidden ? FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS : FAB_PAGE_BOTTOM_PADDING_CLASS,
          sidebarOpen === false ? "md:ml-20" : "md:ml-[280px]"
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
