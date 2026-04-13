/**
 * GET /api/nse/nav?codes=105758,CUSTOM-1771932956132
 *
 * Returns current NAV for one or more of our DB scheme codes.
 *
 * Fallback chain per fund:
 *   1. NSE MASTER_DOWNLOAD  — if the fund has a nse_code in mutual_funds
 *   2. MFAPI               — if the DB code is a numeric AMFI code (non-CUSTOM)
 *   3. DB cached nav        — mutual_funds.current_nav (last resort / CUSTOM funds)
 *
 * Response shape:
 *   {
 *     "105758":            { nav: 194.83, nav_date: "13-Apr-2026", source: "nse" },
 *     "CUSTOM-177...2166": { nav: 40.00,  nav_date: null,          source: "db"  }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMasterNAV } from '@/lib/nseinvest';

const MFAPI_BASE = 'https://api.mfapi.in';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NavRecord = { nav: number | null; nav_date: string | null; source: string };

async function fetchMfapiNav(numericCode: number): Promise<number | null> {
    try {
        const res = await fetch(`${MFAPI_BASE}/mf/${numericCode}/latest`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const json = await res.json();
        const nav = json?.data?.[0]?.nav;
        return nav ? parseFloat(nav) : null;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const codesParam = searchParams.get('codes');

        if (!codesParam?.trim()) {
            return NextResponse.json({ error: 'codes query param is required' }, { status: 400 });
        }

        const requestedCodes = [...new Set(codesParam.split(',').map(c => c.trim()).filter(Boolean))];

        if (requestedCodes.length === 0) {
            return NextResponse.json({ error: 'No valid codes provided' }, { status: 400 });
        }

        // 1. Fetch fund rows — get fallback current_nav (nse_code requires a separate migration)
        const { data: fundRows, error: dbErr } = await supabaseAdmin
            .from('mutual_funds')
            .select('code, current_nav, last_updated')
            .in('code', requestedCodes);

        if (dbErr) {
            return NextResponse.json({ error: dbErr.message }, { status: 500 });
        }

        const fundMap = new Map(
            (fundRows ?? []).map(f => [f.code as string, f])
        );

        // Separate into buckets
        const nseCodeToDbCode = new Map<string, string>();   // nse_code → db code
        const needsMfapi: string[] = [];                      // db codes to try MFAPI
        const result: Record<string, NavRecord> = {};

        for (const dbCode of requestedCodes) {
            const fund = fundMap.get(dbCode);
            if (fund?.nse_code) {
                nseCodeToDbCode.set(fund.nse_code as string, dbCode);
            } else {
                needsMfapi.push(dbCode);
            }
        }

        // 2. NSE MASTER_DOWNLOAD for funds with nse_code
        let nseFailedCodes: string[] = [];
        if (nseCodeToDbCode.size > 0) {
            let nseResults: Awaited<ReturnType<typeof getMasterNAV>> = [];
            try {
                nseResults = await getMasterNAV([...nseCodeToDbCode.keys()]);
            } catch (err) {
                console.warn('[api/nse/nav] NSE call failed:', err);
                // All NSE-targeted funds fall through to MFAPI
                nseFailedCodes = [...nseCodeToDbCode.values()];
            }

            const nseNavMap = new Map(nseResults.map(r => [r.scheme_code, r]));

            for (const [nseCode, dbCode] of nseCodeToDbCode) {
                const record = nseNavMap.get(nseCode);
                if (record) {
                    result[dbCode] = { nav: record.nav, nav_date: record.nav_date, source: 'nse' };
                } else {
                    nseFailedCodes.push(dbCode);
                }
            }
        }

        // 3. MFAPI fallback — for funds without nse_code + any NSE misses
        const mfapiCandidates = [...needsMfapi, ...nseFailedCodes];
        await Promise.all(
            mfapiCandidates.map(async (dbCode) => {
                // Only numeric (non-CUSTOM) codes exist in MFAPI
                const numericCode = parseInt(dbCode, 10);
                if (!isNaN(numericCode)) {
                    const nav = await fetchMfapiNav(numericCode);
                    if (nav !== null) {
                        result[dbCode] = { nav, nav_date: null, source: 'mfapi' };
                        return;
                    }
                }
                // 4. DB cached NAV — last resort (always works, including CUSTOM funds)
                const fund = fundMap.get(dbCode);
                result[dbCode] = {
                    nav: fund?.current_nav ?? null,
                    nav_date: fund?.last_updated
                        ? new Date(fund.last_updated as string).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : null,
                    source: 'db',
                };
            })
        );

        return NextResponse.json(result, {
            headers: {
                // Cache for 5 minutes — NAV updates once daily after market close
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            },
        });
    } catch (err) {
        console.error('[api/nse/nav]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
