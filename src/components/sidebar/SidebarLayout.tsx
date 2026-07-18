"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { MobileNavDrawer } from "@/components/sidebar/MobileNavDrawer";
import { MobileNavHeader } from "@/components/sidebar/MobileNavHeader";
import { useSidebarToggle, useSidebarHydrated } from "@/hooks/use-sidebar-toggle";
import { useMobileNavDrawerInert } from "@/hooks/use-mobile-nav-drawer-inert";
import { useMaxMd } from "@/hooks/use-max-md";
import {
  FAB_PAGE_BOTTOM_PADDING_CLASS,
  FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS,
} from "@/lib/floating-action-layout";
import { useFloatingOverlay } from "@/components/floating/FloatingOverlayContext";
import { PageTransition } from "@/components/ui/page-transition";

export default function SidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const hydrated = useSidebarHydrated();
  const isOpen = useSidebarToggle((state) => state.isOpen);
  const { fabStackHidden } = useFloatingOverlay();
  const sidebarOpen = hydrated ? isOpen : true;
  const mobileDrawerInert = useMobileNavDrawerInert();
  const isMaxMd = useMaxMd();
  const showMobileNav = isMaxMd !== false;
  const showDesktopSidebar = isMaxMd === false;

  return (
    <>
      {showMobileNav && <MobileNavHeader />}
      {showMobileNav && <MobileNavDrawer />}
      {showDesktopSidebar && <Sidebar />}
      <main
        id="app-main"
        inert={mobileDrawerInert ? true : undefined}
        className={cn(
          "bb-main-container min-h-[100svh] bg-transparent transition-[margin-left] ease-in-out duration-300 motion-reduce:transition-none [contain:layout_style]",
          fabStackHidden ? FAB_PAGE_BOTTOM_PADDING_HIDDEN_CLASS : FAB_PAGE_BOTTOM_PADDING_CLASS,
          sidebarOpen === false ? "md:ml-20" : "md:ml-[280px]"
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
