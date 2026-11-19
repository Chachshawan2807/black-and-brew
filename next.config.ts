import { createRequire } from 'node:module';
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { DEV_WEBPACK_WATCH_IGNORE } from './src/lib/dev-webpack-watch';
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
  // Turbopack is the dev bundler (`npm run dev`). Webpack dev compiles one page for minutes
  // and blocks every other request. `npm run dev:webpack` remains if a Turbopack bug returns.
  // PPR + optimizePackageImports stay production-only: together they can stall Turbopack.
  cacheComponents: isProduction,
  onDemandEntries: {
    maxInactiveAge: 15 * 60 * 1000,
    pagesBufferLength: 8,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    ...(isProduction
      ? {
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
        }
      : {}),
  },
  webpack: (webpackConfig, { dev }) => {
    if (!dev) return webpackConfig;
    webpackConfig.watchOptions = {
      ...webpackConfig.watchOptions,
      ignored: DEV_WEBPACK_WATCH_IGNORE,
    };
    return webpackConfig;
  },
  async redirects() {
    return [
      {
        source: '/:locale/secretary',
        destination: '/:locale/home',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      // Backup when the proxy matcher skips dotted paths: serve the static file
      // instead of compiling the locale not-found page.
      beforeFiles: [
        {
          source: '/:locale/.well-known/:path*',
          destination: '/.well-known/:path*',
        },
      ],
    };
  },
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