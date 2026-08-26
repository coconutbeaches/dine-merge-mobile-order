const { withSentryConfig } = require('@sentry/nextjs');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fupducghlxscyeykhvkl.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-f163d6c7060f490a95f87ed1300b2fff.r2.dev',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'dine-merge-mobile-order.vercel.app',
          },
        ],
        destination: 'https://dine.coconutbeachkohphangan.com/:path*',
        permanent: true,
      },
    ];
  },
  ...(process.env.NODE_ENV === 'production' && {
    logging: {
      fetches: {
        fullUrl: false,
      },
    },
  }),
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  sourcemaps: {
    disable: true,
  },
});
