import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND_LOGO_INTRINSIC, BRAND_LOGO_SRC } from '@/lib/brand-assets';

export type BrandLogoSize = 'sidebar-expanded' | 'sidebar-icon' | 'mobile';

const BRAND_LOGO_DARK =
  'dark:invert dark:brightness-0 dark:opacity-90';

/**
 * Brand mark — intrinsic dimensions match the PNG so Next.js can preserve aspect ratio.
 * Display size uses one explicit axis + `height: auto` to avoid the dev warning:
 * "width or height modified, but not the other".
 */
const SIZE_STYLES: Record<
  BrandLogoSize,
  { width: string; maxHeight: string; objectPosition?: string }
> = {
  'sidebar-expanded': {
    width: '240px',
    maxHeight: '90px',
    objectPosition: 'left center',
  },
  'sidebar-icon': {
    width: '56px',
    maxHeight: '56px',
  },
  mobile: {
    width: '200px',
    maxHeight: '68px',
    objectPosition: 'left center',
  },
};

export function BrandLogo({
  size,
  alt = 'BLACK AND BREW',
  priority = true,
  className,
}: {
  size: BrandLogoSize;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  const layout = SIZE_STYLES[size];

  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={alt}
      width={BRAND_LOGO_INTRINSIC.width}
      height={BRAND_LOGO_INTRINSIC.height}
      className={cn(BRAND_LOGO_DARK, className)}
      style={{
        width: layout.width,
        height: 'auto',
        maxHeight: layout.maxHeight,
        objectFit: 'contain',
        objectPosition: layout.objectPosition ?? 'center',
      }}
      priority={priority}
    />
  );
}
