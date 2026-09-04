import { createRequire } from 'node:module';
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { buildSecurityHeaders } from './src/lib/security/headers';

const require = createRequire(import.meta.url);

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

const isProduction = process.env.NODE_ENV === 'production';
const securityHeaders = buildSecurityHeaders(isProduction);

const nextConfig: NextConfig = {
  // BrandLogo uses quality={100}; Next.js 16 requires explicit qualities allowlist.
  images: {
    qualities: [100, 75],
  },
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