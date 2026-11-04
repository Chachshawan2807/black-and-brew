'use client';

import { useEffect } from 'react';
import { PageStatusBanner } from '@/components/ui/page-status-banner';
import { useTimedPageNotice } from '@/hooks/use-timed-page-notice';
import { SIDEBAR_MENU_ORDER_SAVE_FAILED_EVENT } from '@/lib/sidebar-menu-order-save-notice';

export function SidebarMenuOrderSaveNotice() {
  const { notice, showNotice } = useTimedPageNotice(8000);

  useEffect(() => {
    const onFailed = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showNotice(detail?.message ?? 'บันทึกลำดับเมนูไม่สำเร็จ กรุณาลองใหม่');
    };
    window.addEventListener(SIDEBAR_MENU_ORDER_SAVE_FAILED_EVENT, onFailed);
    return () => window.removeEventListener(SIDEBAR_MENU_ORDER_SAVE_FAILED_EVENT, onFailed);
  }, [showNotice]);

  return <PageStatusBanner message={notice} topClassName="top-4" />;
}
