import type { Metadata, Viewport } from "next";
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar/SidebarLayout';
import I18nProvider from '@/components/providers/I18nProvider';
import AIChatOverlay from '@/components/ai/AIChatWrapper';
import InventoryQuickActionWrapper from '@/components/inventory/InventoryQuickActionWrapper';
import PinGateway from '@/components/auth/PinGateway';
import PwaRegister from '@/components/PwaRegister';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { InventoryNotificationFAB } from '@/components/notifications/InventoryNotificationFAB';
import { FloatingOverlayProvider } from '@/components/floating/FloatingOverlayContext';
import { FabStackHideToggle } from '@/components/floating/FabStackHideToggle';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "BLACK-AND-BREW — Scheduling System",
  description: "High-Availability & Real-time Scheduling System for BLACK-AND-BREW",
  appleWebApp: {
    capable: true,
    title: "BLACKANDBREW",
    statusBarStyle: "default",
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

  // Lock Locale for Static Rendering
  setRequestLocale(locale);

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground bb-transition">
        <ThemeProvider>
        <PwaRegister />
        <PinGateway>
          <NotificationProvider>
          <FloatingOverlayProvider>
          <SidebarLayout>
            <Suspense fallback={
              <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-[12px] font-normal uppercase tracking-[0.3em] text-foreground opacity-40">
                    Streaming BLACKANDBREW...
                  </span>
                </div>
              </div>
            }>
              <I18nProvider locale={locale}>
                {children}
              </I18nProvider>
            </Suspense>
          </SidebarLayout>
          <InventoryQuickActionWrapper />
          <InventoryNotificationFAB />
          <AIChatOverlay />
          <FabStackHideToggle />
          </FloatingOverlayProvider>
          </NotificationProvider>
        </PinGateway>
        </ThemeProvider>
      </body>
    </html>
  );
}