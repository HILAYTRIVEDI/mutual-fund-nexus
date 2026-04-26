import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  try {
    const { clientId, advisorId } = await request.json();

    if (!clientId || !advisorId) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, advisorId' },
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

    // Verify the client belongs to this advisor (if profile still exists).
    // The client-side flow may have already deleted the profile row before
    // this API runs; in that case we still need to delete the auth user,
    // so a missing profile is not a hard failure.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, advisor_id')
      .eq('id', clientId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (profile && profile.advisor_id !== advisorId) {
      return NextResponse.json(
        { error: 'Client not found or not authorized' },
        { status: 403 }
      );
    }

    // Best-effort cleanup of related rows in case the client-side delete
    // missed any (or the profile was deleted but data wasn't).
    await supabaseAdmin.from('holdings').delete().eq('user_id', clientId);
    await supabaseAdmin.from('sips').delete().eq('user_id', clientId);
    await supabaseAdmin.from('transactions').delete().eq('user_id', clientId);
    await supabaseAdmin.from('profiles').delete().eq('id', clientId);

    // Delete auth user — this permanently removes them from Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(clientId);

    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client delete API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
