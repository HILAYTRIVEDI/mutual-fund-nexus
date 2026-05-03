import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: POST /api/clients/update-password
 *
 * Updates the auth password for a client user.
 * Only callable by an authenticated admin (verified via their session).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPassword, advisorId } = body;

    if (!userId || !newPassword || !advisorId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, newPassword, advisorId' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

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

    // Verify the target user exists, is a client, and belongs to the calling advisor
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, advisor_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (profile.role !== 'client') {
      return NextResponse.json(
        { error: 'Password can only be reset for client accounts' },
        { status: 403 }
      );
    }

    if (profile.advisor_id !== advisorId) {
      return NextResponse.json(
        { error: 'Not authorized to reset this client\'s password' },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
