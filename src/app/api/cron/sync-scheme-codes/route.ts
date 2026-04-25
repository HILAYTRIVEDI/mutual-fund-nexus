/**
 * GET/POST /api/cron/sync-scheme-codes
 *
 * Weekly job — refreshes the ISIN → NSE scheme code mapping in mutual_funds.nse_code
 * by downloading the full NSE scheme master.
 *
 * Why weekly: new MF schemes launch periodically; without this, freshly added funds
 * fall through to the MFAPI fallback in /api/cron/daily-refresh.
 *
 * Vercel Cron sends GET. Manual triggers can use POST.
 *
 * Calls into the existing /api/nse/sync-scheme-codes implementation by re-using
 * its handler logic (full scheme master + ISIN match + nav update).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFullSchemeMaster } from '@/lib/nseinvest';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    return runSync(req);
}

export async function POST(req: NextRequest) {
    return runSync(req);
}

async function runSync(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: localFunds, error: fetchErr } = await supabaseAdmin
            .from('mutual_funds')
            .select('code, name, isin_value, nse_code')
            .not('isin_value', 'is', null)
            .is('nse_code', null);

        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!localFunds || localFunds.length === 0) {
            return NextResponse.json({
                matched: 0,
                message: 'All funds already have nse_code set',
            });
        }

        const targetIsins = new Set(localFunds.map(f => f.isin_value as string));

        const nseSchemes = await getFullSchemeMaster();
        if (!nseSchemes || nseSchemes.length === 0) {
            return NextResponse.json(
                { error: 'NSE MASTER_DOWNLOAD returned empty data' },
                { status: 502 }
            );
        }

        const isinToScheme = new Map<string, typeof nseSchemes[0]>();
        for (const scheme of nseSchemes) {
            const isin = (scheme.isin || scheme.isin_no || scheme.isinno) as string | null;
            if (isin && targetIsins.has(isin)) {
                isinToScheme.set(isin, scheme);
            }
        }

        let matched = 0;
        let navUpdated = 0;
        const errors: string[] = [];

        for (const fund of localFunds) {
            const nseScheme = isinToScheme.get(fund.isin_value as string);
            if (!nseScheme) continue;

            const updatePayload: Record<string, unknown> = { nse_code: nseScheme.scheme_code };
            if (nseScheme.nav != null) {
                updatePayload.current_nav = nseScheme.nav;
                updatePayload.last_updated = new Date().toISOString();
                navUpdated++;
            }

            const { error: updateErr } = await supabaseAdmin
                .from('mutual_funds')
                .update(updatePayload)
                .eq('code', fund.code);

            if (updateErr) errors.push(`${fund.code}: ${updateErr.message}`);
            else matched++;
        }

        return NextResponse.json({
            ran_at: new Date().toISOString(),
            total_local_funds: localFunds.length,
            nse_schemes_downloaded: nseSchemes.length,
            matched,
            nav_updated: navUpdated,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        console.error('[cron/sync-scheme-codes]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
