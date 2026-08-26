const productImageHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL || 'https://menu-images.coconut.holiday').hostname;
  } catch {
    return 'menu-images.coconut.holiday';
  }
})();

const VERCEL_DOMAIN = 'dine-merge-mobile-order.vercel.app';
const CUSTOM_DOMAIN = 'menu.coconut.holiday';

const baseCspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
];

const globalHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: baseCspDirectives.join('; ') },
];

const noCacheHeaders = [
  { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate, max-age=0' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'Expires', value: '0' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    position: 'bottom-right',
  },
  turbopack: {
    root: __dirname,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: productImageHostname,
      },
    ],
  },
  // Enable compression
  compress: true,
  // Apply headers in the routing layer instead of invoking middleware merely
  // to attach static response headers.
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: globalHeaders,
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [...baseCspDirectives, "object-src 'none'"].join('; '),
          },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          ...noCacheHeaders,
        ],
      },
      {
        source: '/login',
        headers: noCacheHeaders,
      },
      {
        source: '/debug-auth/:path*',
        headers: noCacheHeaders,
      },
      {
        source: '/debug-admin-auth/:path*',
        headers: noCacheHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*.:ext(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Keep the canonical-domain redirect out of middleware as well.
  redirects: async () => {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: VERCEL_DOMAIN }],
        destination: `https://${CUSTOM_DOMAIN}/:path*`,
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
