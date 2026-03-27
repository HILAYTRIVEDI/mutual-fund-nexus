// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MFAPI_BASE_URL = 'https://api.mfapi.in';

serve(async (req) => {
  try {
    // Create a Supabase client with the Service Role Key for background processing
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all distinct codes from the mutual_funds table
    const { data: funds, error: fetchError } = await supabaseClient
      .from('mutual_funds')
      .select('code, current_nav')
      .not('code', 'is', null);

    if (fetchError) throw fetchError;
    if (!funds || funds.length === 0) {
      return new Response(JSON.stringify({ message: "No funds to update" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Deduplicate scheme codes (sanity check)
    const uniqueFunds = [...new Map(funds.map(f => [f.code, f])).values()];
    const results = [];

    // 2. Fetch latest NAV for each scheme code and update
    // Note: We process them sequentially to avoid rate-limiting mfapi.in
    for (const fund of uniqueFunds) {
      try {
        if (fund.code.toString().startsWith('CUSTOM-')) continue;

        const response = await fetch(`${MFAPI_BASE_URL}/mf/${fund.code}/latest`);
        if (!response.ok) continue;

        const navData = await response.json();

        if (navData?.data?.[0]?.nav) {
          const latestNav = parseFloat(navData.data[0].nav);

          // Only update if NAV has changed
          if (latestNav !== fund.current_nav) {
            const { error: updateError } = await supabaseClient
              .from('mutual_funds')
              .update({
                current_nav: latestNav,
                updated_at: new Date().toISOString()
              })
              .eq('code', fund.code);

            if (updateError) {
              console.error(`Failed to update ${fund.code}:`, updateError);
            } else {
              results.push({ code: fund.code, new_nav: latestNav });
            }
          }
        }
      } catch (err) {
        console.error(`Error processing ${fund.code}:`, err);
      }
    }

    return new Response(JSON.stringify({
      message: "NAV sync completed",
      updatedCount: results.length,
      updates: results
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
