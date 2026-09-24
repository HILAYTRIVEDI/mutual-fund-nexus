/**
 * POST /api/cron/daily-refresh
 *
 * Daily maintenance job — run after AMFI publishes NAVs (scheduled 10 PM IST).
 *
 * What it does:
 *   1. NAV update   — AMFI NAVAll.txt → NSE MASTER_DOWNLOAD → MFAPI fallback → writes mutual_funds.current_nav
 *   2. Holdings     — mirrors fresh NAV into holdings.current_nav for every holding
 *   3. Allotments   — syncs any PENDING transactions that have an nse_order_id
 *
 * Protect with CRON_SECRET env var so only your scheduler can trigger it.
 *
 * Trigger options:
 *   A) GitHub Actions (.github/workflows/daily-nav-refresh.yml) — 16:30 UTC weekdays:
 *        curl -X POST https://your-app.com/api/cron/daily-refresh \
 *             -H "Authorization: Bearer <CRON_SECRET>"
 *
 *   B) Manual (one-off):
 *        Same curl as above.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMasterNAV, getFullSchemeMaster, getAllotmentStatement } from '@/lib/nseinvest';

const MFAPI_BASE = 'https://api.mfapi.in';
// Official AMFI daily NAV file (www.amfiindia.com redirects here)
const AMFI_NAV_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchMfapiNav(numericCode: number): Promise<number | null> {
    try {
        const res = await fetch(`${MFAPI_BASE}/mf/${numericCode}/latest`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const nav = json?.data?.[0]?.nav;
        return nav ? parseFloat(nav) : null;
    } catch {
        return null;
    }
}

/**
 * Downloads AMFI NAVAll.txt and returns scheme_code → NAV.
 * Row format: Scheme Code;ISIN Growth;ISIN Reinvest;Scheme Name;Net Asset Value;Date
 */
async function fetchAmfiNavMap(): Promise<Map<string, number>> {
    const res = await fetch(AMFI_NAV_URL, {
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`AMFI fetch failed: ${res.status}`);

    const text = await res.text();
    const map = new Map<string, number>();
    for (const line of text.split('\n')) {
        const parts = line.trim().split(';');
        if (parts.length < 6 || !/^\d+$/.test(parts[0])) continue;
        const nav = parseFloat(parts[parts.length - 2]);
        if (!isNaN(nav) && nav > 0) map.set(parts[0], nav);
    }
    return map;
}

// Vercel Cron sends GET requests with `Authorization: Bearer <CRON_SECRET>` automatically.
// Manual triggers and external schedulers can use either GET or POST.
export async function GET(req: NextRequest) {
    return runDailyRefresh(req);
}

export async function POST(req: NextRequest) {
    return runDailyRefresh(req);
}

async function runDailyRefresh(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const log: string[] = [];
    const summary = {
        nav_updated: 0,
        nav_amfi: 0,
        nav_mfapi_fallback: 0,
        nav_failed: 0,
        holdings_updated: 0,
        allotments_synced: 0,
        errors: [] as string[],
    };

    try {
        // ─────────────────────────────────────────────
        // STEP 1: Fetch all mutual funds from Supabase
        // ─────────────────────────────────────────────
        const { data: allFunds, error: fundsErr } = await supabaseAdmin
            .from('mutual_funds')
            .select('code, nse_code, current_nav');

        if (fundsErr) {
            return NextResponse.json({ error: `Failed to fetch funds: ${fundsErr.message}` }, { status: 500 });
        }

        const funds = allFunds ?? [];
        log.push(`Total funds: ${funds.length}`);

        const freshNavMap = new Map<string, number>(); // db_code → fresh NAV

        // ─────────────────────────────────────────────
        // STEP 2A: Primary source — AMFI NAVAll.txt
        // ─────────────────────────────────────────────
        try {
            const amfiNavMap = await fetchAmfiNavMap();
            log.push(`AMFI NAVAll.txt returned ${amfiNavMap.size} schemes`);
            for (const fund of funds) {
                const nav = amfiNavMap.get(String(fund.code));
                if (nav != null) {
                    freshNavMap.set(fund.code as string, nav);
                    summary.nav_amfi++;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log.push(`AMFI fetch failed: ${msg}`);
            summary.errors.push(`AMFI: ${msg}`);
        }

        const unresolved = funds.filter(f => !freshNavMap.has(f.code as string));
        const fundsWithNseCode = unresolved.filter(f => f.nse_code);
        const fundsWithoutNseCode = unresolved.filter(f => !f.nse_code);

        // ─────────────────────────────────────────────
        // STEP 2B: NSE MASTER_DOWNLOAD for funds AMFI didn't cover
        // ─────────────────────────────────────────────
        const nseFailedDbCodes: string[] = [];

        if (fundsWithNseCode.length > 0) {
            const nseCodes = fundsWithNseCode.map(f => f.nse_code as string);
            let nseRecords: Awaited<ReturnType<typeof getMasterNAV>> = [];
            try {
                nseRecords = await getMasterNAV(nseCodes);
                log.push(`NSE MASTER_DOWNLOAD returned ${nseRecords.length} records`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                log.push(`NSE MASTER_DOWNLOAD failed: ${msg}`);
                summary.errors.push(`NSE MASTER_DOWNLOAD: ${msg}`);
                nseFailedDbCodes.push(...fundsWithNseCode.map(f => f.code as string));
            }

            if (nseRecords.length > 0) {
                const nseNavByNseCode = new Map(nseRecords.map(r => [r.scheme_code, r.nav]));
                for (const fund of fundsWithNseCode) {
                    const nav = nseNavByNseCode.get(fund.nse_code as string);
                    if (nav != null) {
                        freshNavMap.set(fund.code as string, nav);
                    } else {
                        nseFailedDbCodes.push(fund.code as string);
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        // STEP 2C: MFAPI fallback for NSE failures + funds without nse_code
        // ─────────────────────────────────────────────
        const mfapiCandidates = [
            ...nseFailedDbCodes,
            ...fundsWithoutNseCode.map(f => f.code as string),
        ];

        if (mfapiCandidates.length > 0) {
            log.push(`Trying MFAPI for ${mfapiCandidates.length} funds`);
            await Promise.all(
                mfapiCandidates.map(async (dbCode) => {
                    if (freshNavMap.has(dbCode)) return; // already resolved
                    const numericCode = parseInt(dbCode, 10);
                    if (!isNaN(numericCode)) {
                        const nav = await fetchMfapiNav(numericCode);
                        if (nav !== null) {
                            freshNavMap.set(dbCode, nav);
                            summary.nav_mfapi_fallback++;
                        }
                    }
                })
            );
        }

        // ─────────────────────────────────────────────
        // STEP 2D: Write fresh NAVs to mutual_funds
        // ─────────────────────────────────────────────
        const now = new Date().toISOString();
        for (const [dbCode, nav] of freshNavMap) {
            const { error: updateErr } = await supabaseAdmin
                .from('mutual_funds')
                .update({ current_nav: nav, last_updated: now })
                .eq('code', dbCode);

            if (updateErr) {
                summary.errors.push(`mutual_funds update ${dbCode}: ${updateErr.message}`);
            } else {
                summary.nav_updated++;
            }
        }

        // Funds we couldn't resolve at all
        for (const fund of funds) {
            if (!freshNavMap.has(fund.code as string)) {
                summary.nav_failed++;
                log.push(`No NAV resolved for ${fund.code} — keeping existing`);
            }
        }

        log.push(`NAV: ${summary.nav_updated} updated (${summary.nav_amfi} via AMFI, ${summary.nav_mfapi_fallback} via MFAPI), ${summary.nav_failed} unchanged`);

        // ─────────────────────────────────────────────
        // STEP 3: Mirror fresh NAV into holdings.current_nav
        // ─────────────────────────────────────────────
        for (const [dbCode, nav] of freshNavMap) {
            const { error: holdingsErr, count } = await supabaseAdmin
                .from('holdings')
                .update({ current_nav: nav }, { count: 'exact' })
                .eq('scheme_code', dbCode);

            if (holdingsErr) {
                summary.errors.push(`holdings update ${dbCode}: ${holdingsErr.message}`);
            } else {
                summary.holdings_updated += (count ?? 0);
            }
        }

        log.push(`Holdings: updated current_nav for matching rows`);

        // ─────────────────────────────────────────────
        // STEP 4: Sync pending NSE allotments
        // ─────────────────────────────────────────────
        const { data: pendingTxs } = await supabaseAdmin
            .from('transactions')
            .select('id, nse_order_id, date, user_id, scheme_code')
            .not('nse_order_id', 'is', null)
            .eq('status', 'pending');

        if (pendingTxs && pendingTxs.length > 0) {
            log.push(`Syncing ${pendingTxs.length} pending allotments from NSE`);

            const dates = pendingTxs.map(t => t.date as string).sort();
            const orderIds = pendingTxs.map(t => t.nse_order_id as string);

            try {
                const allotments = await getAllotmentStatement({
                    order_ids: orderIds,
                    from_date: dates[0],
                    to_date: dates[dates.length - 1],
                });

                const allotmentMap = new Map(allotments.map(a => [a.orderno, a]));

                for (const tx of pendingTxs) {
                    const allotment = allotmentMap.get(tx.nse_order_id as string);
                    if (!allotment || allotment.validflag !== 'Y') continue;

                    // Convert DD-MM-YYYY → YYYY-MM-DD
                    const rawDate = allotment.reportdate || allotment.orderdate;
                    let allotmentDateISO: string | undefined;
                    if (rawDate && /^\d{2}-\d{2}-\d{4}$/.test(rawDate as string)) {
                        const [dd, mm, yyyy] = (rawDate as string).split('-');
                        allotmentDateISO = `${yyyy}-${mm}-${dd}`;
                    }

                    const { error: txErr } = await supabaseAdmin
                        .from('transactions')
                        .update({
                            nav: allotment.allottednav,
                            units: allotment.allottedqty,
                            status: 'completed',
                            ...(allotmentDateISO ? { date: allotmentDateISO } : {}),
                        })
                        .eq('id', tx.id);

                    if (!txErr) summary.allotments_synced++;
                    else summary.errors.push(`allotment tx ${tx.id}: ${txErr.message}`);
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                summary.errors.push(`allotment sync: ${msg}`);
                log.push(`Allotment sync failed: ${msg}`);
            }
        } else {
            log.push('No pending allotments to sync');
        }

        log.push(`Allotments synced: ${summary.allotments_synced}`);

        return NextResponse.json({
            ok: true,
            ran_at: now,
            summary,
            log,
        });
    } catch (err) {
        console.error('[cron/daily-refresh]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message, log, summary }, { status: 500 });
    }
}
