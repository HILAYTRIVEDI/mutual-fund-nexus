import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
  );
}

// Browser client for use in client components
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for client-side use
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: always create a new client
    return createClient();
  }
  
  // Browser-side: reuse the same client
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
