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

    // Verify the client belongs to this advisor before deleting
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, advisor_id')
      .eq('id', clientId)
      .eq('advisor_id', advisorId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Client not found or not authorized' },
        { status: 403 }
      );
    }

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
