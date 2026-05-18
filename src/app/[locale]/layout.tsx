import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import SidebarLayout from '@/components/sidebar/SidebarLayout';
import I18nProvider from '@/components/providers/I18nProvider';
import AIChatOverlay from '@/components/ai/AIChatWrapper';
import PinGateway from '@/components/auth/PinGateway';
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BLACK-AND-BREW — Scheduling System",
  description: "High-Availability & Real-time Scheduling System for BLACK-AND-BREW",
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
    <html lang={locale} className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fdfcf0] text-[#000000]">
        <PinGateway>
          <SidebarLayout>
            <Suspense fallback={
              <div className="flex-1 min-h-screen bg-[#fdfcf0] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-[12px] font-normal uppercase tracking-[0.3em] text-[#000000] opacity-40">
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
          <AIChatOverlay />
        </PinGateway>
      </body>
    </html>
  );
}