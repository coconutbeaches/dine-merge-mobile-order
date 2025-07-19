import { NextResponse, type NextRequest } from 'next/server';

const VERCEL_DOMAIN = 'dine-merge-mobile-order.vercel.app';
const CUSTOM_DOMAIN = 'menu.coconut.holiday';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');

  // Only redirect requests coming from the Vercel default domain
  if (host && host.toLowerCase() === VERCEL_DOMAIN) {
    const url = request.nextUrl.clone();
    url.host = CUSTOM_DOMAIN; // substitute host
    return NextResponse.redirect(url, 308);
  }

  // Allow requests already on the custom domain (or anything else) to continue
  return NextResponse.next();
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};
