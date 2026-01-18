import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: POST /api/clients/create
 * 
 * Creates a new client user with auth account using the server-side service role key.
 * This avoids triggering auth state changes for the admin user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, advisorId } = body;

    // Validation
    if (!name || !email || !password || !advisorId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, advisorId' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create server-side Supabase client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create auth user using admin API
    // We pass role in metadata so the DB trigger handles profile creation correctly
    let { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: name,
        role: 'client', // Trigger will catch this and set profile role
      },
    });

    // Handle "User already exists" case (common during dev when DB is wiped but Auth remains)
    // We check both message and code to be robust
    const isUserExistsError = authError && (
        authError.message?.includes('already registered') || 
        (authError as any).code === 'email_exists' ||
        authError.status === 422
    );

    if (isUserExistsError) {
        console.log('User already exists (detected via code/message/status), attempting to recover...');
        
        // Find the existing user
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);
        
        if (existingUser) {
            // Check if profile exists (it might have been wiped)
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('id', existingUser.id)
                .single();
            
            if (!profile) {
                console.log('Profile missing for existing user, recreating...');
                await supabaseAdmin.from('profiles').insert({
                    id: existingUser.id,
                    email: email,
                    full_name: name,
                    role: 'client'
                });
            } else {
                // Should we update the profile? maybe.
                // Ensure role is client if we are adding them as client
                await supabaseAdmin.from('profiles').update({ role: 'client' }).eq('id', existingUser.id);
            }
            
            // Mock a successful response structure
            authData = { user: existingUser } as any;
            authError = null; // Clear error to proceed
        }
    }

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 500 }
      );
    }

    // Profile is handled either by trigger (new user) or manual recovery (existing user) above.

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      email: authData.user.email,
    });
  } catch (error) {
    console.error('Client creation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
