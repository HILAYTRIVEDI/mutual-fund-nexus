import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSchemeLatestNAV } from '@/lib/mfapi';

/**
 * API Route: GET /api/cron/process-sips
 *
 * Vercel Cron Job target. Processes all due SIPs:
 * 1. Finds active SIPs where next_execution_date <= today
 * 2. Fetches current NAV for each fund
 * 3. Creates a transaction record
 * 4. Updates the user's holding (units + average_price)
 * 5. Handles step-up logic (Quarterly / Half-Yearly / Yearly)
 * 6. Advances next_execution_date by one period
 *
 * Protected by CRON_SECRET Bearer token.
 * Query params:
 *   dryRun=true  → simulate without writing to the database
 */
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return processSIPs(request);
}

/**
 * POST endpoint — manual trigger (also requires CRON_SECRET)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return processSIPs(request);
}

async function processSIPs(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    const supabase = getServerSupabaseClient();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Fetch all active SIPs that are due
    const { data: dueSips, error: sipError } = await supabase
      .from('sips')
      .select(`
        *,
        mutual_fund:mutual_funds(name, code, current_nav)
      `)
      .eq('status', 'active')
      .lte('next_execution_date', todayStr);

    if (sipError) {
      console.error('[ProcessSIPs] Error fetching SIPs:', sipError);
      return NextResponse.json(
        { error: 'Failed to fetch due SIPs', details: sipError.message },
        { status: 500 }
      );
    }

    if (!dueSips || dueSips.length === 0) {
      return NextResponse.json({
        message: 'No SIPs due for execution',
        processed: 0,
      });
    }

    const results: {
      sipId: string;
      schemeCode: string;
      userId: string;
      amount: number;
      units: number;
      nav: number;
      steppedUp: boolean;
      newAmount?: number;
      success: boolean;
      error?: string;
    }[] = [];

    for (const sip of dueSips as any[]) {
      try {
        const schemeCode = sip.scheme_code;
        const sipAmount = sip.amount;

        // ── Idempotency check ──────────────────────────────────
        // If a completed transaction already exists for this SIP on or after
        // the current next_execution_date, another run already processed it.
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('sip_id', sip.id)
          .gte('date', sip.next_execution_date)
          .eq('status', 'completed')
          .limit(1);

        if (existingTx && existingTx.length > 0) {
          console.log(`[ProcessSIPs] SIP ${sip.id} already processed for ${sip.next_execution_date}, skipping`);
          results.push({
            sipId: sip.id,
            schemeCode,
            userId: sip.user_id,
            amount: sipAmount,
            units: 0,
            nav: 0,
            steppedUp: false,
            success: true,
            error: 'Already processed (idempotency skip)',
          });
          continue;
        }

        // 2. Get current NAV — robust fallback chain:
        //    a) Live MFAPI fetch (for non-custom funds)
        //    b) Joined mutual_fund record from the SIP query
        //    c) Direct query to mutual_funds table (last resort)
        let currentNav = 0;

        // Step a: Try live MFAPI
        if (schemeCode && !schemeCode.startsWith('CUSTOM-')) {
          try {
            const navData = await getSchemeLatestNAV(parseInt(schemeCode));
            if (navData?.data?.[0]?.nav) {
              currentNav = parseFloat(navData.data[0].nav);
            }
          } catch {
            // MFAPI unavailable — fall through to cached values
          }
        }

        // Step b: Use joined mutual_fund record
        if (currentNav <= 0) {
          currentNav = sip.mutual_fund?.current_nav || 0;
        }

        // Step c: Query mutual_funds table directly
        if (currentNav <= 0 && schemeCode) {
          const { data: fundRow } = await supabase
            .from('mutual_funds')
            .select('current_nav')
            .eq('code', schemeCode)
            .single();
          if (fundRow && (fundRow as any).current_nav > 0) {
            currentNav = (fundRow as any).current_nav;
          }
        }

        if (currentNav <= 0) {
          results.push({
            sipId: sip.id,
            schemeCode,
            userId: sip.user_id,
            amount: sipAmount,
            units: 0,
            nav: currentNav,
            steppedUp: false,
            success: false,
            error: 'NAV is zero or unavailable after all fallbacks',
          });
          continue;
        }

        // 3. Calculate new units
        const newUnits = sipAmount / currentNav;

        if (dryRun) {
          results.push({
            sipId: sip.id,
            schemeCode,
            userId: sip.user_id,
            amount: sipAmount,
            units: newUnits,
            nav: currentNav,
            steppedUp: false,
            success: true,
            error: 'Dry run — no changes made',
          });
          continue;
        }

        // ── Claim: advance next_execution_date FIRST ──────────
        // This prevents concurrent runs from double-processing.
        const nextDate = new Date(sip.next_execution_date);
        if (sip.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (sip.frequency === 'quarterly') {
          nextDate.setMonth(nextDate.getMonth() + 3);
        } else {
          // Default: monthly
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        // Handle step-up logic
        let steppedUp = false;
        let updatedAmount = sipAmount;
        const stepUpAmount = sip.step_up_amount || 0;
        const stepUpInterval = sip.step_up_interval;

        if (stepUpAmount > 0 && stepUpInterval) {
          const startDate = new Date(sip.start_date);
          const monthsElapsed = monthsDiff(startDate, nextDate);
          const stepMonths =
            stepUpInterval === 'Quarterly'
              ? 3
              : stepUpInterval === 'Half-Yearly'
              ? 6
              : 12; // Yearly

          const previousMilestone = Math.floor(
            monthsDiff(startDate, new Date(sip.next_execution_date)) /
              stepMonths
          );
          const nextMilestone = Math.floor(monthsElapsed / stepMonths);

          if (nextMilestone > previousMilestone) {
            updatedAmount = sipAmount + stepUpAmount;
            steppedUp = true;
          }
        }

        // Atomically claim the SIP by advancing its date
        const { error: claimError } = await (supabase.from('sips') as any)
          .update({
            next_execution_date: nextDate.toISOString().split('T')[0],
            amount: updatedAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sip.id)
          .eq('next_execution_date', sip.next_execution_date); // Optimistic lock

        if (claimError) {
          throw new Error(`Failed to claim SIP: ${claimError.message}`);
        }

        // 4. Insert SIP transaction (with sip_id for audit/idempotency)
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: sip.user_id,
            scheme_code: schemeCode,
            type: 'sip',
            amount: sipAmount,
            units: newUnits,
            nav: currentNav,
            status: 'completed',
            date: new Date().toISOString().split('T')[0],
            sip_id: sip.id,
          } as any);

        if (txError) {
          throw new Error(`Transaction insert failed: ${txError.message}`);
        }

        // 5. Update existing holding (upsert units + recalc average_price)
        const { data: existingHolding } = await supabase
          .from('holdings')
          .select('id, units, average_price')
          .eq('user_id', sip.user_id)
          .eq('scheme_code', schemeCode)
          .single();

        if (existingHolding) {
          const oldUnits = (existingHolding as any).units || 0;
          const oldAvg = (existingHolding as any).average_price || 0;
          const totalUnits = oldUnits + newUnits;
          const newAvgPrice =
            totalUnits > 0
              ? (oldUnits * oldAvg + sipAmount) / totalUnits
              : currentNav;

          await (supabase.from('holdings') as any)
            .update({
              units: totalUnits,
              average_price: newAvgPrice,
              updated_at: new Date().toISOString(),
            })
            .eq('id', (existingHolding as any).id);
        } else {
          await (supabase.from('holdings') as any).insert({
            user_id: sip.user_id,
            scheme_code: schemeCode,
            units: newUnits,
            average_price: currentNav,
          });
        }

        // 6. Update mutual_funds NAV cache
        await (supabase.from('mutual_funds') as any)
          .update({
            current_nav: currentNav,
            last_updated: new Date().toISOString(),
          })
          .eq('code', schemeCode);

        results.push({
          sipId: sip.id,
          schemeCode,
          userId: sip.user_id,
          amount: sipAmount,
          units: newUnits,
          nav: currentNav,
          steppedUp,
          newAmount: steppedUp ? updatedAmount : undefined,
          success: true,
        });
      } catch (err) {
        console.error(`[ProcessSIPs] Error processing SIP ${sip.id}:`, err);
        results.push({
          sipId: sip.id,
          schemeCode: sip.scheme_code,
          userId: sip.user_id,
          amount: sip.amount,
          units: 0,
          nav: 0,
          steppedUp: false,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Processed ${dueSips.length} SIPs`,
      processed: dueSips.length,
      successful: successCount,
      failed: failureCount,
      dryRun,
      results,
    });
  } catch (error) {
    console.error('[ProcessSIPs] API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate the approximate number of months between two dates.
 */
function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}
