import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: POST /api/clients/create
 * 
 * Creates a new client user with auth account.
 * The DB trigger will automatically create the profile with:
 * - role: 'client'
 * - advisor_id: the admin who created them
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, advisorId, phone, pan, aadhar } = body;

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

    // Create auth user - the trigger will create the profile
    // We pass advisor_id in metadata so trigger can link client to admin
    let { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'client',
        advisor_id: advisorId,  // This is used by the trigger
      },
    });

    // Handle "User already exists" case
    const isUserExistsError = authError && (
        authError.message?.includes('already registered') || 
        (authError as any).code === 'email_exists' ||
        authError.status === 422
    );

    if (isUserExistsError) {
        console.log('User already exists, attempting to recover...');
        
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);
        
        if (existingUser) {
            // Update existing profile to be a client of this admin
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: existingUser.id,
                    email: email,
                    full_name: name,
                    role: 'client',
                    advisor_id: advisorId,
                    phone: phone || null,
                    pan: pan || null,
                    aadhar: aadhar || null,
                });
            
            if (updateError) {
                console.error('Failed to update existing user profile:', updateError);
            }
            
            authData = { user: existingUser } as any;
            authError = null;
        }
    }

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: 'Failed to create auth user' },
        { status: 500 }
      );
    }

    // Update profile with additional fields (phone, pan) if provided
    // The trigger creates basic profile, we add extra fields here
    if (phone || pan || aadhar) {
      await supabaseAdmin
        .from('profiles')
        .update({ 
          phone: phone || null, 
          pan: pan || null,
          aadhar: aadhar || null,
          kyc_status: 'pending'
        })
        .eq('id', authData.user.id);
    }

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
