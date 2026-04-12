/**
 * POST /api/nse/sync-allotment
 *
 * Syncs authoritative allotment data (NAV, units, allotment date) from NSE Invest
 * back into the local Supabase `transactions` table, then reconciles `holdings`.
 *
 * Request body:
 *   { transaction_ids?: string[] }   — omit to sync all pending transactions
 *
 * The route:
 *   1. Reads PENDING transactions from Supabase that have an `nse_order_id` set.
 *   2. Calls NSE ALLOTMENT_STATEMENT for those order IDs.
 *   3. Patches `nav`, `units`, `date` (allotment date), `status` in Supabase.
 *   4. Reconciles `holdings` — recalculates units and average_price from completed transactions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllotmentStatement } from '@/lib/nseinvest';

// Use service-role key so RLS doesn't block server-side writes
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const filterIds: string[] | undefined = body.transaction_ids;

        // 1. Fetch PENDING transactions that have an NSE order ID
        let query = supabaseAdmin
            .from('transactions')
            .select('id, nse_order_id, date, amount, user_id, scheme_code')
            .not('nse_order_id', 'is', null)
            .eq('status', 'pending');

        if (filterIds && filterIds.length > 0) {
            query = query.in('id', filterIds);
        }

        const { data: txRows, error: fetchErr } = await query;
        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!txRows || txRows.length === 0) {
            return NextResponse.json({ synced: 0, message: 'No pending transactions with NSE order IDs found' });
        }

        // 2. Determine date range for the allotment statement
        const dates = txRows.map(t => t.date as string).sort();
        const fromDate = dates[0];
        const toDate = dates[dates.length - 1];

        const orderIds = txRows.map(t => t.nse_order_id as string);

        // 3. Call NSE Invest API
        const allotments = await getAllotmentStatement({
            order_ids: orderIds,
            from_date: fromDate,
            to_date: toDate,
        });

        if (allotments.length === 0) {
            return NextResponse.json({ synced: 0, message: 'NSE returned no allotment records' });
        }

        // Build lookup: nse_order_id → allotment (keyed by NSE field `orderno`)
        const allotmentMap = Object.fromEntries(
            allotments.map(a => [a.orderno, a])
        );

        // 4. Patch each transaction in Supabase
        let synced = 0;
        const errors: string[] = [];
        // Track which (user_id, scheme_code) pairs need holding reconciliation
        const holdingKeysToReconcile = new Set<string>();

        for (const tx of txRows) {
            const allotment = allotmentMap[tx.nse_order_id as string];
            if (!allotment) continue;

            // validflag "Y" means units have been allotted
            const isAllotted = allotment.validflag === 'Y';

            // Convert NSE allotment date from DD-MM-YYYY → YYYY-MM-DD for DB storage
            const rawDate = allotment.reportdate || allotment.orderdate;
            let allotmentDateISO: string | null = null;
            if (rawDate && /^\d{2}-\d{2}-\d{4}$/.test(rawDate as string)) {
                const [dd, mm, yyyy] = (rawDate as string).split('-');
                allotmentDateISO = `${yyyy}-${mm}-${dd}`;
            }

            const { error: updateErr } = await supabaseAdmin
                .from('transactions')
                .update({
                    nav: allotment.allottednav,
                    units: allotment.allottedqty,
                    // Write authoritative allotment date from NSE (overrides order placement date)
                    ...(allotmentDateISO ? { date: allotmentDateISO } : {}),
                    status: isAllotted ? 'completed' : 'pending',
                })
                .eq('id', tx.id);

            if (updateErr) {
                errors.push(`tx ${tx.id}: ${updateErr.message}`);
            } else {
                synced++;
                if (isAllotted && tx.user_id && tx.scheme_code) {
                    holdingKeysToReconcile.add(`${tx.user_id}::${tx.scheme_code}`);
                }
            }
        }

        // 5. Reconcile holdings — recalculate units and average_price from all completed buy/sip transactions
        const reconcileErrors: string[] = [];
        for (const key of holdingKeysToReconcile) {
            const [userId, schemeCode] = key.split('::');

            // Sum all completed buy/sip transactions for this user+scheme
            const { data: completedTxs, error: txFetchErr } = await supabaseAdmin
                .from('transactions')
                .select('units, nav, amount, type')
                .eq('user_id', userId)
                .eq('scheme_code', schemeCode)
                .eq('status', 'completed')
                .in('type', ['buy', 'sip']);

            if (txFetchErr) {
                reconcileErrors.push(`holdings reconcile fetch ${key}: ${txFetchErr.message}`);
                continue;
            }

            if (!completedTxs || completedTxs.length === 0) continue;

            const totalUnits = completedTxs.reduce((sum, t) => sum + (t.units || 0), 0);
            const totalAmount = completedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
            const averagePrice = totalUnits > 0 ? totalAmount / totalUnits : 0;

            // Upsert holding — update units and average_price
            const { data: existingHolding } = await supabaseAdmin
                .from('holdings')
                .select('id')
                .eq('user_id', userId)
                .eq('scheme_code', schemeCode)
                .single();

            if (existingHolding?.id) {
                const { error: holdingUpdateErr } = await supabaseAdmin
                    .from('holdings')
                    .update({ units: totalUnits, average_price: averagePrice })
                    .eq('id', existingHolding.id);

                if (holdingUpdateErr) {
                    reconcileErrors.push(`holdings update ${key}: ${holdingUpdateErr.message}`);
                }
            }
        }

        return NextResponse.json({
            synced,
            total: txRows.length,
            holdings_reconciled: holdingKeysToReconcile.size,
            errors: errors.length > 0 ? errors : undefined,
            reconcile_errors: reconcileErrors.length > 0 ? reconcileErrors : undefined,
        });
    } catch (err) {
        console.error('[nse/sync-allotment]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
