/**
 * POST /api/nse/sync-scheme-codes
 *
 * Backfills mutual_funds.nse_code by:
 *   1. Fetching all funds from Supabase that have isin_value set but nse_code missing.
 *   2. Calling NSE MASTER_DOWNLOAD (no filter → full scheme master).
 *   3. Building an ISIN → NSE scheme code map from the response.
 *   4. Updating nse_code on each matched fund row.
 *
 * Also optionally refreshes current_nav from the MASTER_DOWNLOAD response
 * (since NAV comes back for free in the same call).
 *
 * Request body (all optional):
 *   {
 *     force?: boolean        — if true, re-sync even funds that already have nse_code
 *     update_nav?: boolean   — if true, also write current_nav from NSE response (default: true)
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFullSchemeMaster } from '@/lib/nseinvest';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const force: boolean = body.force === true;
        const updateNav: boolean = body.update_nav !== false; // default true

        // 1. Fetch funds from Supabase that have an ISIN to match on
        let query = supabaseAdmin
            .from('mutual_funds')
            .select('code, name, isin_value, nse_code')
            .not('isin_value', 'is', null);

        // Unless forced, only process funds that don't have an nse_code yet
        if (!force) {
            query = query.is('nse_code', null);
        }

        const { data: localFunds, error: fetchErr } = await query;

        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!localFunds || localFunds.length === 0) {
            return NextResponse.json({
                matched: 0,
                message: force
                    ? 'No funds with isin_value found in mutual_funds table'
                    : 'All funds already have nse_code set. Pass { "force": true } to re-sync.',
            });
        }

        // Build a set of ISINs we need to look up
        const targetIsins = new Set(
            localFunds.map(f => f.isin_value as string)
        );

        // 2. Download full NSE scheme master
        let nseSchemes;
        try {
            nseSchemes = await getFullSchemeMaster();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return NextResponse.json(
                { error: `NSE MASTER_DOWNLOAD failed: ${msg}` },
                { status: 502 }
            );
        }

        if (!nseSchemes || nseSchemes.length === 0) {
            return NextResponse.json(
                { error: 'NSE MASTER_DOWNLOAD returned empty data' },
                { status: 502 }
            );
        }

        // 3. Build ISIN → scheme master record map (only for ISINs we care about)
        // NSE may return isin under different field names — check common variants
        const isinToScheme = new Map<string, typeof nseSchemes[0]>();
        for (const scheme of nseSchemes) {
            // Try all known field name variants for ISIN
            const isin = (scheme.isin || scheme.isin_no || scheme.isinno) as string | null;
            if (isin && targetIsins.has(isin)) {
                isinToScheme.set(isin, scheme);
            }
        }

        // 4. Update each matched fund in Supabase
        let matched = 0;
        let navUpdated = 0;
        const unmatched: string[] = [];
        const errors: string[] = [];

        for (const fund of localFunds) {
            const isin = fund.isin_value as string;
            const nseScheme = isinToScheme.get(isin);

            if (!nseScheme) {
                unmatched.push(`${fund.code} (${fund.name}) — ISIN ${isin} not found in NSE master`);
                continue;
            }

            const nseCode = nseScheme.scheme_code;
            const updatePayload: Record<string, unknown> = { nse_code: nseCode };

            if (updateNav && nseScheme.nav != null) {
                updatePayload.current_nav = nseScheme.nav;
                updatePayload.last_updated = new Date().toISOString();
                navUpdated++;
            }

            const { error: updateErr } = await supabaseAdmin
                .from('mutual_funds')
                .update(updatePayload)
                .eq('code', fund.code);

            if (updateErr) {
                errors.push(`${fund.code}: ${updateErr.message}`);
            } else {
                matched++;
            }
        }

        return NextResponse.json({
            total_local_funds: localFunds.length,
            nse_schemes_downloaded: nseSchemes.length,
            matched,
            nav_updated: updateNav ? navUpdated : 'skipped',
            unmatched: unmatched.length > 0 ? unmatched : undefined,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        console.error('[nse/sync-scheme-codes]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
