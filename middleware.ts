import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refresh Supabase auth cookies only for document/page requests.
 *
 * API routes, Next.js assets, service-worker/static files, and other file
 * requests do not need session refresh. Excluding them at the matcher level
 * means they never start middleware compute in the first place.
 *
 * Security/cache headers and the canonical-domain redirect are configured in
 * next.config.js so those behaviors no longer require middleware execution.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookiesToSet) {
        // Update cookies on the request for downstream handlers.
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        // Update cookies on the response for the browser.
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

  // getUser() validates/refreshes the cookie-backed session when needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!api|rest/v1|auth/v1|_next|.*\\..*).*)',
  ],
};
