import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabaseTypes';

type LogPayload = Record<string, unknown>;

const getBrowserContext = () => {
  if (typeof window === 'undefined') {
    return {} as LogPayload;
  }

  return {
    path: window.location.pathname,
    href: window.location.href,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  } as LogPayload;
};

let cachedClient: SupabaseClient<Database> | null = null;

const getSupabaseClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[logImageLoadError] Missing Supabase environment variables');
    return null;
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
};

export const logImageLoadError = async (payload: LogPayload) => {
  const context = { ...getBrowserContext(), ...payload };

  try {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      return;
    }

    const { error } = await supabaseClient
      .from('error_logs')
      .insert({
        event_name: 'product_image_load_failed',
        metadata: context,
      });

    if (error) {
      console.warn('[logImageLoadError] Failed to persist error log', error);
    }
  } catch (logError) {
    console.warn('[logImageLoadError] Unexpected logging failure', logError);
  }
};
