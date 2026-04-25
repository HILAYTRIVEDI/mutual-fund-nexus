/**
 * GET/POST /api/cron/sync-scheme-codes
 *
 * Weekly job. Downloads the full NSE scheme master and:
 *   1. Caches it into nse_scheme_master (powers the dropdown when MFAPI search misses)
 *   2. Backfills mutual_funds.nse_code for any rows whose ISIN matches
 *
 * Vercel Cron sends GET. Manual triggers can use POST.
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
        // 1. Download the full NSE scheme universe
        const nseSchemes = await getFullSchemeMaster();
        if (!nseSchemes || nseSchemes.length === 0) {
            return NextResponse.json(
                { error: 'NSE MASTER_DOWNLOAD returned empty data' },
                { status: 502 }
            );
        }

        const now = new Date().toISOString();

        // 2. Cache the entire master into nse_scheme_master (chunked upsert).
        // PostgREST has a payload size limit, so chunk to keep requests sane.
        const masterRows = nseSchemes.map(s => ({
            scheme_code: s.scheme_code,
            scheme_name: s.scheme_name,
            isin: (s.isin || s.isin_no || s.isinno) as string | null,
            amc_code: s.amc_code ?? null,
            scheme_type: s.scheme_type ?? null,
            current_nav: s.nav ?? null,
            nav_date: s.nav_date ?? null,
            last_synced: now,
        }));

        const CHUNK = 500;
        let masterUpserted = 0;
        const masterErrors: string[] = [];

        for (let i = 0; i < masterRows.length; i += CHUNK) {
            const chunk = masterRows.slice(i, i + CHUNK);
            const { error: upsertErr } = await supabaseAdmin
                .from('nse_scheme_master')
                .upsert(chunk, { onConflict: 'scheme_code' });

            if (upsertErr) {
                masterErrors.push(`chunk ${i}: ${upsertErr.message}`);
            } else {
                masterUpserted += chunk.length;
            }
        }

        // 3. Backfill nse_code on existing mutual_funds rows that have an ISIN but no nse_code
        const { data: localFunds, error: fetchErr } = await supabaseAdmin
            .from('mutual_funds')
            .select('code, isin_value, nse_code')
            .not('isin_value', 'is', null)
            .is('nse_code', null);

        if (fetchErr) {
            return NextResponse.json({
                ran_at: now,
                master_upserted: masterUpserted,
                matched: 0,
                error: `Failed to read mutual_funds: ${fetchErr.message}`,
            }, { status: 500 });
        }

        let matched = 0;
        let navUpdated = 0;
        const matchErrors: string[] = [];

        if (localFunds && localFunds.length > 0) {
            const targetIsins = new Set(localFunds.map(f => f.isin_value as string));
            const isinToScheme = new Map<string, typeof nseSchemes[0]>();

            for (const scheme of nseSchemes) {
                const isin = (scheme.isin || scheme.isin_no || scheme.isinno) as string | null;
                if (isin && targetIsins.has(isin)) {
                    isinToScheme.set(isin, scheme);
                }
            }

            for (const fund of localFunds) {
                const nseScheme = isinToScheme.get(fund.isin_value as string);
                if (!nseScheme) continue;

                const updatePayload: Record<string, unknown> = { nse_code: nseScheme.scheme_code };
                if (nseScheme.nav != null) {
                    updatePayload.current_nav = nseScheme.nav;
                    updatePayload.last_updated = now;
                    navUpdated++;
                }

                const { error: updateErr } = await supabaseAdmin
                    .from('mutual_funds')
                    .update(updatePayload)
                    .eq('code', fund.code);

                if (updateErr) matchErrors.push(`${fund.code}: ${updateErr.message}`);
                else matched++;
            }
        }

        return NextResponse.json({
            ran_at: now,
            nse_schemes_downloaded: nseSchemes.length,
            master_upserted: masterUpserted,
            local_funds_to_match: localFunds?.length ?? 0,
            matched,
            nav_updated: navUpdated,
            errors: [...masterErrors, ...matchErrors].length > 0
                ? [...masterErrors, ...matchErrors]
                : undefined,
        });
    } catch (err) {
        console.error('[cron/sync-scheme-codes]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
