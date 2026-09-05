'use client';

import { Menu } from '@/lib/icons';
import { BrandLogo } from '@/components/sidebar/BrandLogo';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { BB_BTN_ICON } from '@/lib/ui-outlined-tokens';
import { cn } from '@/lib/utils';
import { useMobileNavDrawer } from '@/hooks/use-mobile-nav-drawer';

export function MobileNavHeader() {
  const isOpen = useMobileNavDrawer((s) => s.isOpen);
  const openDrawer = useMobileNavDrawer((s) => s.openDrawer);

  return (
    <header className="bb-mobile-nav-header md:hidden sticky top-0 z-50 shrink-0 bg-[var(--sidebar-surface)] border-b border-black/5 dark:border-white/10 pl-1 pr-3 flex justify-between items-center min-h-[72px] bb-shadow-sm">
      <div className="flex items-center">
        <BrandLogo size="mobile" />
      </div>
      <div className="flex items-center gap-1">
        <HintTooltip tip="เปิดเมนูนำทาง" side="bottom">
          <button
            type="button"
            onClick={() => openDrawer()}
            className={cn(BB_BTN_ICON, 'touch-manipulation')}
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
