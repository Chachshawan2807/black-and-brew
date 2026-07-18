'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { useMobileNavDrawer } from '@/hooks/use-mobile-nav-drawer';

export function MobileNavHeader() {
  const isOpen = useMobileNavDrawer((s) => s.isOpen);
  const openDrawer = useMobileNavDrawer((s) => s.openDrawer);

  return (
    <header className="bb-mobile-nav-header md:hidden sticky top-0 z-50 bg-[var(--sidebar-surface)] border-b border-black/5 dark:border-white/10 pl-1 pr-3 flex justify-between items-center h-[72px] bb-shadow-sm">
      <div className="flex items-center">
        <Image
          src="/images/logo.png"
          alt="BLACK AND BREW"
          width={200}
          height={68}
          className="dark:invert dark:brightness-0 dark:opacity-90"
          style={{
            width: '200px',
            height: '68px',
            objectFit: 'contain',
            objectPosition: 'left center',
          }}
          priority
        />
      </div>
      <div className="flex items-center gap-1">
        <HintTooltip tip="เปิดเมนูนำทาง" side="bottom">
          <button
            type="button"
            onClick={() => openDrawer()}
            className="h-10 w-10 flex items-center justify-center rounded-full bb-transition hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15"
            aria-label="เปิดเมนูนำทาง"
            aria-expanded={isOpen}
            aria-controls="bb-nav-drawer"
          >
            <Menu className="w-6 h-6 text-foreground" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </HintTooltip>
      </div>
    </header>
  );
}
