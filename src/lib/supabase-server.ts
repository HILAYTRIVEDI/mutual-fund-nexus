import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

// Server-side Supabase client with service role key for admin operations
// This should only be used in API routes and server-side code

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let serverClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get a server-side Supabase client with service role key.
 * This bypasses RLS and should only be used for admin operations in API routes.
 * 
 * WARNING: Never expose the service role key to the client!
 */
export function getServerSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase server environment variables. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    );
  }

  if (!serverClient) {
    serverClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serverClient;
}
