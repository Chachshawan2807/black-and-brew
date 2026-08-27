'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { preloadRouteChunk } from '@/lib/route-chunk-preload';

type NavPreloadLinkProps = ComponentProps<typeof Link>;

function warmRoute(href: string) {
  preloadRouteChunk(href);
}

export function NavPreloadLink({
  href,
  onMouseEnter,
  onFocus,
  onPointerDown,
  onTouchStart,
  ...props
}: NavPreloadLinkProps) {
  const hrefStr = typeof href === 'string' ? href : href.pathname ?? '';

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        warmRoute(hrefStr);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warmRoute(hrefStr);
        onFocus?.(e);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || e.button === 0) {
          warmRoute(hrefStr);
        }
        onPointerDown?.(e);
      }}
      onTouchStart={(e) => {
        warmRoute(hrefStr);
        onTouchStart?.(e);
      }}
      {...props}
    />
  );
}
