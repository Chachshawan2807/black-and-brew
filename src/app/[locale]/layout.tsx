import type { Metadata, Viewport } from "next";
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar/SidebarLayout';
import I18nProvider from '@/components/providers/I18nProvider';
import { FabStackHideToggle } from '@/components/floating/FabStackHideToggle';
import { DeferredOverlays } from '@/components/shell/DeferredOverlays';
import { RoutePrefetchOnIdle } from '@/components/shell/RoutePrefetchOnIdle';
import { ViewTransitionNavigation } from '@/components/shell/ViewTransitionNavigation';
import PwaRegister from '@/components/PwaRegister';
import { PwaShellSync } from '@/components/PwaShellSync';
import PinGateway from '@/components/auth/PinGateway';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { PushSubscriptionManager } from '@/components/notifications/PushSubscriptionManager';
import { FloatingOverlayProvider } from '@/components/floating/FloatingOverlayContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AppTooltipProvider } from '@/components/providers/AppTooltipProvider';
import { PWA_APPLE_TOUCH_ICON, PWA_FAVICON } from '@/lib/pwa-assets';
import { PWA_SHELL_BOOTSTRAP_SCRIPT, PWA_THEME_COLORS } from '@/lib/pwa-standalone';
import { appFontClassName } from '@/lib/fonts';
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: PWA_THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: PWA_THEME_COLORS.dark },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "BLACK-AND-BREW — Scheduling System",
  description: "High-Availability & Real-time Scheduling System for BLACK-AND-BREW",
  icons: {
    icon: [
      { url: PWA_FAVICON, type: 'image/png' },
    ],
    apple: PWA_APPLE_TOUCH_ICON,
  },
  appleWebApp: {
    capable: true,
    title: "BLACKANDBREW",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export function generateStaticParams() {
  return [{ locale: 'th' }, { locale: 'en' }];
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${appFontClassName} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground bb-transition">
        <script
          dangerouslySetInnerHTML={{ __html: PWA_SHELL_BOOTSTRAP_SCRIPT }}
        />
        <ThemeProvider>
        <PwaShellSync />
        <AppTooltipProvider>
        <PwaRegister />
        <RoutePrefetchOnIdle />
        <ViewTransitionNavigation />
        <PinGateway>
          <PushSubscriptionManager />
          <NotificationProvider>
          <FloatingOverlayProvider>
          <SidebarLayout>
            <Suspense fallback={<RouteLoadingSkeleton label="กำลังโหลด..." />}>
              <I18nProvider locale={locale}>
                {children}
              </I18nProvider>
            </Suspense>
          </SidebarLayout>
          <DeferredOverlays />
          <FabStackHideToggle />
          </FloatingOverlayProvider>
          </NotificationProvider>
        </PinGateway>
        </AppTooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
