import { NextRequest, NextResponse } from 'next/server';

const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedMap: Map<number, string> | null = null;
let cachedReverseMap: Map<string, number> | null = null;
let cacheTimestamp = 0;

async function getAmfiIsinMap(): Promise<{ forward: Map<number, string>; reverse: Map<string, number> }> {
    if (cachedMap && cachedReverseMap && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        return { forward: cachedMap, reverse: cachedReverseMap };
    }

    const response = await fetch(AMFI_NAV_URL, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`AMFI fetch failed: ${response.status}`);
    }

    const text = await response.text();
    const map = new Map<number, string>();
    const reverseMap = new Map<string, number>();

    for (const line of text.split('\n')) {
        const parts = line.trim().split(';');
        if (parts.length < 3) continue;

        const schemeCode = parseInt(parts[0], 10);
        const isin = parts[1]?.trim();

        // Valid data row: numeric scheme code + valid ISIN (starts with 'IN')
        if (isNaN(schemeCode) || !isin || !isin.startsWith('IN')) continue;

        map.set(schemeCode, isin);
        // Only store first occurrence so Growth plan wins over Dividend plans
        if (!reverseMap.has(isin)) reverseMap.set(isin, schemeCode);
    }

    cachedMap = map;
    cachedReverseMap = reverseMap;
    cacheTimestamp = Date.now();
    return { forward: map, reverse: reverseMap };
}

/** GET /api/amfi/isin-lookup?isin=<ISIN>
 * Reverse lookup: returns { schemeCode } for the given ISIN.
 */
export async function GET(request: NextRequest) {
    try {
        const isin = new URL(request.url).searchParams.get('isin')?.trim().toUpperCase();
        if (!isin || !isin.startsWith('IN')) {
            return NextResponse.json({ error: 'Valid ISIN required' }, { status: 400 });
        }
        const { reverse } = await getAmfiIsinMap();
        const schemeCode = reverse.get(isin);
        if (!schemeCode) {
            return NextResponse.json({ error: 'ISIN not found in AMFI data' }, { status: 404 });
        }
        return NextResponse.json({ schemeCode });
    } catch (error) {
        console.error('AMFI ISIN reverse lookup error:', error);
        return NextResponse.json({ error: 'Failed to fetch AMFI data' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { schemeCodes: number[] };
        const { schemeCodes } = body;

        if (!Array.isArray(schemeCodes) || schemeCodes.length === 0) {
            return NextResponse.json({ error: 'schemeCodes array required' }, { status: 400 });
        }

        const { forward: isinMap } = await getAmfiIsinMap();
        const result: Record<number, string> = {};

        for (const code of schemeCodes) {
            const isin = isinMap.get(code);
            if (isin) result[code] = isin;
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('AMFI ISIN lookup error:', error);
        return NextResponse.json({ error: 'Failed to fetch AMFI data' }, { status: 500 });
    }
}
