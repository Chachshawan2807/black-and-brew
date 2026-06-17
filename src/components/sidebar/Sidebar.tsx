"use client";

import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import Menu from "@/components/sidebar/Menu";
import { useSidebarToggle, useSidebarHydrated } from "@/hooks/use-sidebar-toggle";
import { SidebarToggle } from "@/components/sidebar/SidebarToggle";
import { sidebarSurface, withReducedMotion, MODAL_EASE } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import Image from "next/image";

function SidebarLogo({
  sidebarOpen,
  reduced,
}: {
  sidebarOpen: boolean;
  reduced: boolean;
}) {
  const transition = {
    duration: reduced ? 0.01 : 0.28,
    ease: MODAL_EASE,
  };

  return (
    <div
      className={cn(
        'relative z-[110] min-w-0 bb-sidebar-logo',
        sidebarOpen ? 'h-[90px] w-full' : 'h-14 w-14 mx-auto',
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
        <Image
          src="/images/logo.png"
          alt="BLACK AND BREW"
          width={240}
          height={90}
          className="dark:invert dark:brightness-0 dark:opacity-90"
          style={{
            width: '240px',
            height: '90px',
            objectFit: 'contain',
            objectPosition: 'left center',
          }}
          priority
        />
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
        <Image
          src="/images/logo.png"
          alt=""
          width={56}
          height={56}
          className="dark:invert dark:brightness-0 dark:opacity-90"
          style={{ width: '56px', height: '56px', objectFit: 'contain' }}
          priority
        />
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
        'fixed top-0 left-0 z-[100] h-[100svh] text-foreground transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none bg-transparent border-none md:flex md:border-r md:border-black/5 dark:md:border-white/10',
        sidebarOpen === false
          ? 'md:w-20'
          : 'md:w-[280px]'
      )}
    >
      <SidebarToggle isOpen={sidebarOpen} setIsOpen={setIsOpen} />
      <div className="relative h-full flex flex-col pl-2 pr-3 py-4 overflow-hidden bg-[var(--sidebar-surface)] md:bg-transparent w-full">
        <div
          className={cn(
            'mb-4 flex items-center transition-[justify-content] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
            sidebarOpen === false ? 'justify-center' : 'justify-between gap-2',
          )}
        >
          <SidebarLogo sidebarOpen={sidebarOpen} reduced={reduced} />
        </div>
        <div className="flex-1 overflow-hidden">
          <Menu isOpen={sidebarOpen} />
        </div>
      </div>
    </motion.aside>
  );
}
