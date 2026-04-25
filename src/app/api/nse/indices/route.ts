/**
 * GET /api/nse/indices?index=NIFTY%2050
 *
 * Fetches live market index data from NSE India.
 * Uses session-cookie flow: first hits the homepage to get cookies,
 * then calls the API endpoint with those cookies.
 *
 * Supported indices: NIFTY 50, NIFTY BANK, NIFTY IT, NIFTY MIDCAP 100, INDIA VIX, etc.
 * Without ?index param, defaults to NIFTY 50.
 *
 * Response is cached for 60 seconds (market data is near-real-time during trading hours).
 */

import { NextRequest, NextResponse } from 'next/server';

const NSE_BASE = 'https://www.nseindia.com';

const BROWSER_HEADERS: Record<string, string> = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    Referer: `${NSE_BASE}/market-data/live-market-indices`,
    Connection: 'keep-alive',
};

// India VIX uses a different endpoint
const VIX_INDEX = 'INDIA VIX';

// In-memory session cache — avoids hitting NSE homepage on every request
let cachedCookies: string | null = null;
let cookieExpiry = 0;
let inflightCookies: Promise<string> | null = null;

async function fetchSessionCookies(): Promise<string> {
    // Warm up on the same page as the Referer — NSE binds API access
    // to cookies set by that path.
    const res = await fetch(`${NSE_BASE}/market-data/live-market-indices`, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
    });

    const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
    const cookies = setCookieHeaders
        .map((c) => c.split(';')[0])
        .join('; ');

    cachedCookies = cookies;
    cookieExpiry = Date.now() + 4 * 60 * 1000;
    return cookies;
}

async function getSessionCookies(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && cachedCookies && now < cookieExpiry) {
        return cachedCookies;
    }

    // Serialize concurrent warm-ups so 5 parallel requests share one fetch.
    if (!inflightCookies) {
        inflightCookies = fetchSessionCookies().finally(() => {
            inflightCookies = null;
        });
    }
    return inflightCookies;
}

async function fetchNseJson(apiUrl: string): Promise<Response> {
    const cookies = await getSessionCookies();
    let res = await fetch(apiUrl, {
        headers: { ...BROWSER_HEADERS, Cookie: cookies },
        signal: AbortSignal.timeout(10000),
    }).catch((err) => err as Error);

    const failed =
        res instanceof Error || !res.ok;

    if (failed) {
        cachedCookies = null;
        cookieExpiry = 0;
        const fresh = await getSessionCookies(true);
        res = await fetch(apiUrl, {
            headers: { ...BROWSER_HEADERS, Cookie: fresh },
            signal: AbortSignal.timeout(10000),
        });
    }

    if (res instanceof Error) throw res;
    return res;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const indexName = searchParams.get('index') || 'NIFTY 50';

        let apiUrl: string;

        if (indexName.toUpperCase() === VIX_INDEX) {
            apiUrl = `${NSE_BASE}/api/allIndices`;
        } else {
            apiUrl = `${NSE_BASE}/api/equity-stockIndices?index=${encodeURIComponent(indexName)}`;
        }

        const dataRes = await fetchNseJson(apiUrl);

        if (!dataRes.ok) {
            return NextResponse.json(
                { error: `NSE returned ${dataRes.status}` },
                { status: dataRes.status }
            );
        }

        const data = await dataRes.json();

        // For VIX, extract just the VIX entry from allIndices
        if (indexName.toUpperCase() === VIX_INDEX) {
            const vixEntry = data?.data?.find(
                (d: { index: string }) => d.index === 'INDIA VIX'
            );
            if (vixEntry) {
                return NextResponse.json(
                    {
                        name: 'INDIA VIX',
                        lastPrice: vixEntry.last,
                        change: vixEntry.variation,
                        pChange: vixEntry.percentChange,
                        previousClose: vixEntry.previousClose,
                        open: vixEntry.open,
                        dayHigh: vixEntry.high,
                        dayLow: vixEntry.low,
                        timestamp: data.timestamp,
                    },
                    {
                        headers: {
                            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
                        },
                    }
                );
            }
        }

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
            },
        });
    } catch (err) {
        // Clear cookie cache on any error
        cachedCookies = null;
        cookieExpiry = 0;
        console.error('[api/nse/indices]', err);
        const message = err instanceof Error ? err.message : 'Failed to fetch indices';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
