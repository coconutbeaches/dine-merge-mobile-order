import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabaseTypes';

// Service Role Client (Server-side only)
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables for service role client');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
}

// Server Component Client (uses cookies for auth)
export async function createServerClient() {
  const cookieStore = await cookies();
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore });
}

// Server-side admin role verification
export async function verifyAdminRole(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  error: string | null;
}> {
  const verifyStartTime = Date.now();
  console.log(`[verifyAdminRole()] ${verifyStartTime} - Starting admin role verification`);
  
  try {
    // First, get the user from cookies
    console.log(`[verifyAdminRole()] ${Date.now()} - Creating server client`);
    const supabase = await createServerClient();
    
    console.log(`[verifyAdminRole()] ${Date.now()} - Getting user from cookies`);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log(`[verifyAdminRole()] ${Date.now()} - User error, returning false`);
      return { isAdmin: false, userId: null, error: error?.message ?? 'no user' };
    }

    console.log(`[verifyAdminRole()] ${Date.now()} - User found, userId: ${user.id}`);

    // Now use service role client to check the user's role
    console.log(`[verifyAdminRole()] ${Date.now()} - Creating service role client`);
    const serviceClient = createServiceRoleClient();
    
    console.log(`[verifyAdminRole()] ${Date.now()} - Querying profile for userId: ${user.id}`);
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    console.log(`[verifyAdminRole()] ${Date.now()} - Profile query result:`, { profile, profileError });

    // Temporary console.log to ensure it works
    console.log('verifyAdminRole:', { user, profile });

    if (profileError) {
      console.log(`[verifyAdminRole()] ${Date.now()} - Profile error, returning false`);
      return { isAdmin: false, userId: user.id, error: profileError.message };
    }

    const isAdmin = profile?.role === 'admin';
    console.log(`[verifyAdminRole()] ${Date.now()} - Role check completed: isAdmin=${isAdmin}, role=${profile?.role} (total time: ${Date.now() - verifyStartTime}ms)`);
    return { isAdmin, userId: user.id, error: null };
  } catch (error) {
    console.error(`[verifyAdminRole()] ${Date.now()} - Exception occurred:`, error);
    return { 
      isAdmin: false, 
      userId: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
