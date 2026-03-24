/**
 * POST /api/nse/sync-allotment
 *
 * Syncs authoritative allotment data (NAV, units, allotment date) from NSE Invest
 * back into the local Supabase `transactions` table.
 *
 * Request body:
 *   { transaction_ids?: string[] }   — omit to sync all pending transactions
 *
 * The route:
 *   1. Reads transactions from Supabase that have an `nse_order_id` set.
 *   2. Calls NSE ALLOTMENT_STATEMENT for those order IDs.
 *   3. Patches `nav`, `units`, `status` in Supabase with the authoritative values.
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

        // 1. Fetch transactions that have an NSE order ID
        let query = supabaseAdmin
            .from('transactions')
            .select('id, nse_order_id, date, amount')
            .not('nse_order_id', 'is', null);

        if (filterIds && filterIds.length > 0) {
            query = query.in('id', filterIds);
        }

        const { data: txRows, error: fetchErr } = await query;
        if (fetchErr) {
            return NextResponse.json({ error: fetchErr.message }, { status: 500 });
        }

        if (!txRows || txRows.length === 0) {
            return NextResponse.json({ synced: 0, message: 'No transactions with NSE order IDs found' });
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

        // Build lookup: nse_order_id → allotment
        const allotmentMap = Object.fromEntries(
            allotments.map(a => [a.order_id, a])
        );

        // 4. Patch each transaction in Supabase
        let synced = 0;
        const errors: string[] = [];

        for (const tx of txRows) {
            const allotment = allotmentMap[tx.nse_order_id as string];
            if (!allotment) continue;

            const { error: updateErr } = await supabaseAdmin
                .from('transactions')
                .update({
                    nav: allotment.allotted_nav,
                    units: allotment.allotted_units,
                    status: allotment.status?.toLowerCase() === 'allotted' ? 'completed' : 'pending',
                })
                .eq('id', tx.id);

            if (updateErr) {
                errors.push(`tx ${tx.id}: ${updateErr.message}`);
            } else {
                synced++;
            }
        }

        return NextResponse.json({
            synced,
            total: txRows.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        console.error('[nse/sync-allotment]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
