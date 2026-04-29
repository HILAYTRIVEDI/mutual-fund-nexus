import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, advisorId, phone, pan, aadhar } = body;

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'client', advisor_id: advisorId },
    });

    // Handle "User already exists" — delete the stale auth user and recreate fresh.
    // Updating an existing (possibly soft-deleted) auth user via updateUserById is
    // unreliable: Supabase may return success but the user still cannot sign in.
    // A clean delete+recreate is the only guaranteed path to a working login.
    const isUserExistsError = authError && (
      authError.message?.includes('already registered') ||
      (authError as any).code === 'email_exists' ||
      authError.status === 422
    );

    if (isUserExistsError) {
      console.log('[create] Email already exists — finding stale user to clean up...');

      // Fetch up to 1000 users so pagination doesn't hide the target
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const staleUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (staleUser) {
        // Safety check: only wipe if this user belongs to this advisor (or has no profile at all)
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, advisor_id')
          .eq('id', staleUser.id)
          .maybeSingle();

        const ownedByThisAdvisor = existingProfile?.advisor_id === advisorId;
        const orphaned = !existingProfile;

        if (!ownedByThisAdvisor && !orphaned) {
          return NextResponse.json(
            { error: 'This email is already registered under a different advisor' },
            { status: 409 }
          );
        }

        // Clean slate: remove stale auth user (and its profile, if any)
        await supabaseAdmin.from('profiles').delete().eq('id', staleUser.id);
        const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(staleUser.id);
        if (deleteErr) {
          console.error('[create] Failed to delete stale auth user:', deleteErr.message);
          return NextResponse.json({ error: 'Failed to clean up existing user account. Please try again.' }, { status: 500 });
        }

        // Now create fresh — guaranteed to work since the email is freed
        const { data: freshData, error: freshErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name, role: 'client', advisor_id: advisorId },
        });

        if (freshErr) {
          return NextResponse.json({ error: freshErr.message }, { status: 400 });
        }

        authData = freshData;
        authError = null;
      }
      // If staleUser not found even at perPage:1000, fall through to the authError check below
    }

    if (authError) {
      console.error('[create] Auth user creation error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
    }

    // Always explicitly upsert the profile — don't rely solely on a DB trigger.
    // This guarantees the profile exists even if the trigger is absent or delayed.
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email,
      full_name: name,
      role: 'client',
      advisor_id: advisorId,
      phone: phone || null,
      pan: pan || null,
      aadhar: aadhar || null,
      kyc_status: 'pending',
      email_sip_reminders: true,
      email_sip_executed: true,
      reminder_days_before: 2,
    });

    if (profileError) {
      console.error('[create] Profile upsert failed:', profileError.message);
      // Auth user was created — don't fail the request, but log it
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      email: authData.user.email,
    });
  } catch (error) {
    console.error('[create] Client creation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
