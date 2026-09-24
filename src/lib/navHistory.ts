// Client helpers for historical NAV calculations (Lumpsum / Transfer forms)

export type NavRow = { date: string; nav: string };

/**
 * Resolve an AMFI scheme code for the selected fund.
 * Order: numeric schemeCode > numeric fund code > ISIN lookup > exact scheme-name lookup.
 * The name fallback covers funds typed into the search box without picking a dropdown item.
 */
export async function resolveAmfiSchemeCode(opts: {
    schemeCode?: number;
    fundCode?: string;
    isin?: string;
    name?: string;
}): Promise<number> {
    if (opts.schemeCode && opts.schemeCode > 0) return opts.schemeCode;
    const parsed = /^\d+$/.test(opts.fundCode ?? '') ? parseInt(opts.fundCode!, 10) : 0;
    if (parsed > 0) return parsed;

    const lookups: string[] = [];
    if (opts.isin?.startsWith('IN')) lookups.push(`isin=${encodeURIComponent(opts.isin)}`);
    if (opts.name && opts.name.trim().length >= 5) lookups.push(`name=${encodeURIComponent(opts.name.trim())}`);
    for (const q of lookups) {
        try {
            const res = await fetch(`/api/amfi/isin-lookup?${q}`);
            if (res.ok) {
                const data = await res.json() as { schemeCode?: number };
                if (data.schemeCode && data.schemeCode > 0) return data.schemeCode;
            }
        } catch { /* best effort */ }
    }
    return 0;
}

/** NAV history (newest first, DD-MM-YYYY) — MFAPI with the recent gap filled from AMFI. */
export async function fetchNavHistory(amfiCode: number): Promise<NavRow[]> {
    const res = await fetch(`/api/nav/history?code=${amfiCode}`);
    if (!res.ok) throw new Error('Failed to fetch NAV history');
    const data = await res.json() as { data?: NavRow[] };
    if (!data.data?.length) throw new Error('No NAV data available for this fund');
    return data.data;
}

export const FUND_NOT_RESOLVED_MSG =
    'Could not match this fund to an AMFI scheme code. Please pick the fund from the search dropdown.';
