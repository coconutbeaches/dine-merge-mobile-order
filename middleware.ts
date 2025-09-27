import { NextResponse, type NextRequest } from 'next/server';

const VERCEL_DOMAIN = 'dine-merge-mobile-order.vercel.app';
const CUSTOM_DOMAIN = 'menu.coconut.holiday';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;

  // Only redirect requests coming from the Vercel default domain
  if (host && host.toLowerCase() === VERCEL_DOMAIN) {
    const url = request.nextUrl.clone();
    url.host = CUSTOM_DOMAIN; // substitute host
    return NextResponse.redirect(url, 308);
  }

  // Create response with security headers
  const response = NextResponse.next();
  
  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy (CSP) - customize based on your needs
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  
  // Apply stricter CSP for admin routes
  if (pathname.startsWith('/admin')) {
    cspDirectives.push("object-src 'none'");
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Add cache headers for static assets
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // Add cache headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  }
  
  return response;
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};
