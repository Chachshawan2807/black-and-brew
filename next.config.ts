import { createRequire } from 'node:module';
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const require = createRequire(import.meta.url);

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      process.env.NODE_ENV === 'production'
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // PPR + optimizePackageImports can stall Turbopack's first /[locale] dev compile (120s+ hang).
  // Keep both for production bundle size and PPR; skip in dev for responsive local iteration.
  cacheComponents: isProduction,
  ...(isProduction
    ? {
        experimental: {
          optimizePackageImports: [
            'lucide-react',
            'date-fns',
            'date-fns-tz',
            'framer-motion',
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
            '@dnd-kit/modifiers',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-slot',
          ],
        },
      }
    : {}),
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/pwa-assets.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

const config = withNextIntl(nextConfig);

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (value: NextConfig) => value;

export default withBundleAnalyzer(config);