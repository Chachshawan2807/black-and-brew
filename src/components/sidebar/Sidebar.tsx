"use client";

import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import Menu from "@/components/sidebar/Menu";
import { useSidebarToggle, useSidebarHydrated } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/sidebar/SidebarToggle";
import { sidebarSurface, withReducedMotion, MODAL_EASE, MOTION_DURATION } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { BrandLogo } from '@/components/sidebar/BrandLogo';

function SidebarLogo({
  sidebarOpen,
  reduced,
}: {
  sidebarOpen: boolean;
  reduced: boolean;
}) {
  const transition = {
    duration: reduced ? 0.01 : MOTION_DURATION.slow,
    ease: MODAL_EASE,
  };

  return (
    <div
      className={cn(
        'relative z-[110] min-w-0 bb-sidebar-logo',
        sidebarOpen ? 'h-[90px] w-full max-w-[calc(100%-2.5rem)]' : 'h-14 w-14 mx-auto',
      )}
    >
      <motion.div
        className="absolute left-0 top-1/2 -translate-y-1/2 origin-left"
        initial={false}
        animate={{
          opacity: sidebarOpen ? 1 : 0,
          scale: sidebarOpen ? 1 : 0.9,
        }}
        transition={transition}
        style={{ pointerEvents: sidebarOpen ? 'auto' : 'none' }}
        aria-hidden={!sidebarOpen}
      >
        <BrandLogo size="sidebar-expanded" />
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
        initial={false}
        animate={{
          opacity: sidebarOpen ? 0 : 1,
          scale: sidebarOpen ? 0.88 : 1,
        }}
        transition={transition}
        style={{ pointerEvents: sidebarOpen ? 'none' : 'auto' }}
        aria-hidden={sidebarOpen}
      >
        <BrandLogo size="sidebar-icon" alt="" />
      </motion.div>
    </div>
  );
}

export function Sidebar() {
  const hydrated = useSidebarHydrated();
  const isOpen = useSidebarToggle((state) => state.isOpen);
  const setIsOpen = useSidebarToggle((state) => state.setIsOpen);
  const sidebarOpen = hydrated ? isOpen : true;
  const reduced = usePrefersReducedMotion();
  const surfaceMotion = withReducedMotion(sidebarSurface, reduced);

  return (
    <motion.aside
      initial={surfaceMotion.initial}
      animate={surfaceMotion.animate}
      transition={surfaceMotion.transition}
      className={cn(
        'fixed top-0 left-0 z-[100] h-[100svh] overflow-visible text-foreground transition-[width] [transition-duration:var(--bb-duration-slow)] [transition-timing-function:var(--bb-ease-out)] motion-reduce:transition-none bg-transparent border-none md:flex md:border-r md:border-black/5 dark:md:border-white/10',
        sidebarOpen === false
          ? 'md:w-20'
          : 'md:w-[280px]'
      )}
    >
      <div
        className={cn(
          'relative h-full flex flex-col overflow-visible py-4 bg-[var(--sidebar-surface)] md:bg-transparent w-full',
          sidebarOpen ? 'pl-2 pr-3' : 'px-2',
        )}
      >
        <div
          className={cn(
            'relative z-[120] mb-4 flex items-center overflow-visible transition-[justify-content] [transition-duration:var(--bb-duration-slow)] [transition-timing-function:var(--bb-ease-out)] motion-reduce:transition-none',
            sidebarOpen === false ? 'justify-center' : 'justify-start pr-9',
          )}
        >
          <SidebarLogo sidebarOpen={sidebarOpen} reduced={reduced} />
          <SidebarToggle isOpen={sidebarOpen} setIsOpen={setIsOpen} />
        </div>
        <div className="flex-1 overflow-hidden">
          <Menu isOpen={sidebarOpen} />
        </div>
      </div>
    </motion.aside>
  );
}
