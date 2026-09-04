'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { LazySidebarLayout } from '@/components/shell/LazySidebarLayout';
import { AppTooltipProvider } from '@/components/providers/AppTooltipProvider';
import { FloatingOverlayProvider } from '@/components/floating/FloatingOverlayContext';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';
import { LazyNotificationProvider } from '@/components/shell/LazyNotificationProvider';

const authShellLoading = () => (
  <RouteLoadingSkeleton label="กำลังเตรียมระบบ..." />
);

const PwaShellSync = dynamic(
  () => import('@/components/PwaShellSync').then((m) => ({ default: m.PwaShellSync })),
  { ssr: false },
);

const PwaRegister = dynamic(() => import('@/components/PwaRegister'), { ssr: false });

const RoutePrefetchOnIdle = dynamic(
  () =>
    import('@/components/shell/RoutePrefetchOnIdle').then((m) => ({
      default: m.RoutePrefetchOnIdle,
    })),
  { ssr: false },
);

const ViewTransitionNavigation = dynamic(
  () =>
    import('@/components/shell/ViewTransitionNavigation').then((m) => ({
      default: m.ViewTransitionNavigation,
    })),
  { ssr: false },
);

const PointerClickThroughGuard = dynamic(
  () =>
    import('@/components/shell/PointerClickThroughGuard').then((m) => ({
      default: m.PointerClickThroughGuard,
    })),
  { ssr: false },
);

const PinGateway = dynamic(() => import('@/components/auth/PinGateway'), {
  loading: authShellLoading,
});

const PushSubscriptionManager = dynamic(
  () =>
    import('@/components/notifications/PushSubscriptionManager').then((m) => ({
      default: m.PushSubscriptionManager,
    })),
  { ssr: false },
);

const DeferredOverlays = dynamic(
  () =>
    import('@/components/shell/DeferredOverlays').then((m) => ({
      default: m.DeferredOverlays,
    })),
  { ssr: false },
);

const FabStackHideToggle = dynamic(
  () =>
    import('@/components/floating/FabStackHideToggle').then((m) => ({
      default: m.FabStackHideToggle,
    })),
  { ssr: false },
);

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PwaShellSync />
      <AppTooltipProvider>
        <PwaRegister />
        <RoutePrefetchOnIdle />
        <ViewTransitionNavigation />
        <PointerClickThroughGuard />
        <PinGateway>
          <PushSubscriptionManager />
          <LazyNotificationProvider>
            <FloatingOverlayProvider>
              <LazySidebarLayout>{children}</LazySidebarLayout>
              <DeferredOverlays />
              <FabStackHideToggle />
            </FloatingOverlayProvider>
          </LazyNotificationProvider>
        </PinGateway>
      </AppTooltipProvider>
    </>
  );
}
