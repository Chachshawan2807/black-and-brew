'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * Genuine "order does not exist" boundary. Transient DB/auth/network failures do
 * NOT reach here (the page throws to the locale error boundary instead), so this
 * screen is always an intentional, actionable state rather than a blank window.
 */
export default function BeanOrderNotFound() {
  const pathname = usePathname();
  const locale = pathname.split('/').filter(Boolean)[0] || 'th';
  const listHref = `/${locale}/bean-orders`;

  return (
    <div className="min-h-[60svh] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-base font-normal text-foreground">ไม่พบออเดอร์นี้</p>
      <p className="text-sm text-muted-foreground max-w-md">
        ออเดอร์อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง
      </p>
      <Link
        href={listHref}
        data-bb-nav="instant"
        className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-normal text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> กลับรายการออเดอร์
      </Link>
    </div>
  );
}
