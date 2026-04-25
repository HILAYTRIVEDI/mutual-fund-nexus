/**
 * GET /api/mf/search?q=<query>
 *
 * Unified mutual fund search across MFAPI (AMFI mirror) AND the cached
 * NSE scheme master. Results are merged by ISIN so a scheme available in
 * both sources is returned once.
 *
 * Response: array of MergedFundScheme
 *   - schemeCode: number — AMFI/MFAPI code (0 if NSE-only)
 *   - schemeName: string
 *   - isin?:     string
 *   - nseCode?:  string — NSE scheme code (when present in NSE master)
 *   - source:    'mfapi' | 'nse' | 'both'
 *
 * The fund-add flow uses `schemeCode` as the primary key when > 0,
 * else falls back to `nseCode` for NSE-only schemes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MFAPI_BASE = 'https://api.mfapi.in';
const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
const AMFI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type MergedFundScheme = {
    schemeCode: number;
    schemeName: string;
    isin?: string;
    nseCode?: string;
    source: 'mfapi' | 'nse' | 'both';
};

// AMFI scheme_code → ISIN, cached in module memory
let amfiIsinCache: Map<number, string> | null = null;
let amfiCacheAt = 0;

async function getAmfiIsinMap(): Promise<Map<number, string>> {
    if (amfiIsinCache && Date.now() - amfiCacheAt < AMFI_CACHE_TTL_MS) {
        return amfiIsinCache;
    }
    const res = await fetch(AMFI_NAV_URL, { cache: 'no-store' });
    if (!res.ok) return new Map();

    const text = await res.text();
    const map = new Map<number, string>();
    for (const line of text.split('\n')) {
        const parts = line.trim().split(';');
        if (parts.length < 3) continue;
        const code = parseInt(parts[0], 10);
        const isin = parts[1]?.trim();
        if (!isNaN(code) && isin && isin.startsWith('IN')) {
            map.set(code, isin);
        }
    }
    amfiIsinCache = map;
    amfiCacheAt = Date.now();
    return map;
}

type MfapiRow = { schemeCode: number; schemeName: string };
type NseMasterRow = {
    scheme_code: string;
    scheme_name: string;
    isin: string | null;
};

async function searchMfapi(q: string): Promise<MfapiRow[]> {
    try {
        const res = await fetch(`${MFAPI_BASE}/mf/search?q=${encodeURIComponent(q)}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [];
        return (await res.json()) as MfapiRow[];
    } catch {
        return [];
    }
}

async function searchNseMaster(q: string, limit: number): Promise<NseMasterRow[]> {
    // Trigram-friendly ILIKE on scheme_name. Cheap until master grows past ~50k rows
    // (NSE universe is ~5k schemes today), and the trigram GIN index covers it.
    const { data, error } = await supabaseAdmin
        .from('nse_scheme_master')
        .select('scheme_code, scheme_name, isin')
        .ilike('scheme_name', `%${q}%`)
        .limit(limit);

    if (error) {
        console.warn('[api/mf/search] nse_scheme_master query failed:', error.message);
        return [];
    }
    return (data ?? []) as NseMasterRow[];
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);

    if (!q || q.length < 2) {
        return NextResponse.json([]);
    }

    // Run both searches in parallel
    const [mfapiHits, nseHits] = await Promise.all([
        searchMfapi(q),
        searchNseMaster(q, limit),
    ]);

    const mfapiTop = mfapiHits.slice(0, limit);

    // Resolve ISINs for MFAPI results (so we can dedupe against NSE)
    let amfiIsinMap: Map<number, string> = new Map();
    if (mfapiTop.length > 0) {
        try {
            amfiIsinMap = await getAmfiIsinMap();
        } catch {
            // best effort
        }
    }

    const merged = new Map<string, MergedFundScheme>();
    // Key strategy:
    //   - if ISIN is known → use ISIN (so MFAPI+NSE rows merge)
    //   - else fall back to a per-source synthetic key

    // 1. Seed from MFAPI
    for (const row of mfapiTop) {
        const isin = amfiIsinMap.get(row.schemeCode);
        const key = isin ?? `mfapi:${row.schemeCode}`;
        merged.set(key, {
            schemeCode: row.schemeCode,
            schemeName: row.schemeName,
            isin,
            source: 'mfapi',
        });
    }

    // 2. Layer in NSE — merge by ISIN, otherwise add as nse-only
    for (const row of nseHits) {
        const isin = row.isin ?? undefined;
        const key = isin ?? `nse:${row.scheme_code}`;
        const existing = merged.get(key);
        if (existing) {
            // Same fund visible in both → enrich with NSE code
            existing.nseCode = row.scheme_code;
            existing.isin = existing.isin ?? isin;
            existing.source = 'both';
        } else {
            merged.set(key, {
                schemeCode: 0, // no AMFI/MFAPI presence
                schemeName: row.scheme_name,
                isin,
                nseCode: row.scheme_code,
                source: 'nse',
            });
        }
    }

    // Rank: 'both' first, then 'mfapi', then 'nse'; preserve insertion order within each
    const rank = { both: 0, mfapi: 1, nse: 2 } as const;
    const results = [...merged.values()].sort((a, b) => rank[a.source] - rank[b.source]);

    return NextResponse.json(results.slice(0, limit), {
        headers: {
            // Search results are stable for a few minutes; revalidate often during typing
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        },
    });
}
