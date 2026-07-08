'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { preloadRouteChunk } from '@/lib/route-chunk-preload';

type NavPreloadLinkProps = ComponentProps<typeof Link>;

export function NavPreloadLink({ href, onMouseEnter, onFocus, ...props }: NavPreloadLinkProps) {
  const hrefStr = typeof href === 'string' ? href : href.pathname ?? '';

  return (
    <Link
      href={href}
      onMouseEnter={(e) => {
        preloadRouteChunk(hrefStr);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        preloadRouteChunk(hrefStr);
        onFocus?.(e);
      }}
      {...props}
    />
  );
}
