import type { Metadata, Viewport } from "next";
import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AppShellLoader } from '@/components/shell/AppShellLoader';
import I18nProvider from '@/components/providers/I18nProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { RouteLoadingSkeleton } from '@/components/ui/route-loading-skeleton';
import { PWA_APPLE_TOUCH_ICON, PWA_FAVICON } from '@/lib/pwa-assets';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
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
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  applicationName: PWA_DISPLAY_NAME,
  title: "BLACK-AND-BREW",
  description: "High-Availability & Real-time Scheduling System for BLACK-AND-BREW",
  icons: {
    icon: [
      { url: PWA_FAVICON, type: 'image/png' },
    ],
    apple: PWA_APPLE_TOUCH_ICON,
  },
  appleWebApp: {
    capable: true,
    title: PWA_DISPLAY_NAME,
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
          <AppShellLoader>
            <Suspense fallback={<RouteLoadingSkeleton label="กำลังโหลด..." />}>
              <I18nProvider locale={locale}>{children}</I18nProvider>
            </Suspense>
          </AppShellLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}
