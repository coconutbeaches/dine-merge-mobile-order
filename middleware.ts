import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const VERCEL_DOMAIN = 'dine-merge-mobile-order.vercel.app';
const CUSTOM_DOMAIN = 'menu.coconut.holiday';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;

  // Only redirect requests coming from the Vercel default domain
  if (host && host.toLowerCase() === VERCEL_DOMAIN) {
    const url = request.nextUrl.clone();
    url.host = CUSTOM_DOMAIN;
    return NextResponse.redirect(url, 308);
  }

  // Create response with security headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // ============================================================
  // SUPABASE AUTH SESSION REFRESH
  // This keeps cookies in sync with the browser's localStorage session.
  // Without this, server-side auth fails after the initial cookie expires.
  // ============================================================
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          // Update cookies on the request (for downstream middleware/handlers)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Update cookies on the response (for the browser)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // IMPORTANT: This getUser() call triggers Supabase to:
    // 1. Read the current session from cookies
    // 2. If the access token is expired but refresh token is valid, refresh it
    // 3. Write the new tokens back to cookies via setAll()
    // This keeps server-side auth in sync with client-side auth.
    await supabase.auth.getUser();
  }

  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy (CSP)
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

  // Never cache authenticated/admin pages to prevent stale auth state.
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/debug-auth') ||
    pathname.startsWith('/debug-admin-auth')
  ) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};
