'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

type NavPreloadLinkProps = ComponentProps<typeof Link>;

export function NavPreloadLink({
  href,
  onMouseEnter,
  onFocus,
  onPointerDown,
  onTouchStart,
  ...props
}: NavPreloadLinkProps) {
  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      onTouchStart={onTouchStart}
      {...props}
    />
  );
}
