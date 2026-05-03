import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

// Server-side Supabase client with service role key for admin operations
// This should only be used in API routes and server-side code

/**
 * Get a server-side Supabase client with service role key.
 * Creates a fresh client per call — safe for concurrent serverless invocations.
 *
 * WARNING: Never expose the service role key to the client!
 */
export function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase server environment variables. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
