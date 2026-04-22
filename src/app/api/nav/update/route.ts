/**
 * POST /api/nav/update
 *
 * Fetches the latest NAV from MFAPI.in for all scheme codes present in the
 * `mutual_funds` table and persists them to `mutual_funds.current_nav`.
 *
 * This ensures a warm DB-cached NAV is always available as a fallback,
 * eliminating the "stale" badge on cold page loads.
 *
 * Call this:
 *   - After Indian market close (3:30 PM IST) via a scheduled task / cron
 *   - Or manually via the advisor dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSchemeLatestNAV } from '@/lib/mfapi';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch all scheme codes from mutual_funds
        const { data: funds, error: fetchErr } = await supabaseAdmin
            .from('mutual_funds')
            .select('code');

        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!funds || funds.length === 0) {
            return NextResponse.json({ updated: 0, message: 'No schemes in mutual_funds table' });
        }

        const today = new Date().toISOString().split('T')[0];
        let updated = 0;
        const errors: string[] = [];

        // 2. Fetch and update each scheme's NAV
        await Promise.all(
            funds.map(async (fund) => {
                const code = fund.code as string;
                // Skip custom or non-MFAPI codes
                if (!code || code.startsWith('CUSTOM-') || isNaN(parseInt(code, 10))) return;

                try {
                    const navData = await getSchemeLatestNAV(parseInt(code, 10));
                    const latestNav = navData?.data?.[0]?.nav;
                    if (!latestNav) return;

                    const { error: updateErr } = await supabaseAdmin
                        .from('mutual_funds')
                        .update({
                            current_nav: parseFloat(latestNav),
                            last_updated: today,
                        })
                        .eq('code', code);

                    if (updateErr) {
                        errors.push(`${code}: ${updateErr.message}`);
                    } else {
                        updated++;
                    }
                } catch {
                    // MFAPI may not have this scheme — skip silently
                }
            })
        );

        return NextResponse.json({
            updated,
            total: funds.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        console.error('[nav/update]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
