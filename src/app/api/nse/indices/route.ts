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
    'Accept-Encoding': 'gzip, deflate, br',
    Referer: `${NSE_BASE}/market-data/live-market-indices`,
    Connection: 'keep-alive',
};

// India VIX uses a different endpoint
const VIX_INDEX = 'INDIA VIX';

// In-memory session cache — avoids hitting NSE homepage on every request
let cachedCookies: string | null = null;
let cookieExpiry = 0;

async function getSessionCookies(): Promise<string> {
    const now = Date.now();
    if (cachedCookies && now < cookieExpiry) {
        return cachedCookies;
    }

    const res = await fetch(`${NSE_BASE}/`, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
    });

    // Extract set-cookie headers
    const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
    const cookies = setCookieHeaders
        .map((c) => c.split(';')[0])
        .join('; ');

    cachedCookies = cookies;
    // Cache cookies for 4 minutes (NSE session usually lasts ~5 min)
    cookieExpiry = now + 4 * 60 * 1000;

    return cookies;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const indexName = searchParams.get('index') || 'NIFTY 50';

        // Get session cookies
        const cookies = await getSessionCookies();

        const headers = {
            ...BROWSER_HEADERS,
            Cookie: cookies,
        };

        let apiUrl: string;

        if (indexName.toUpperCase() === VIX_INDEX) {
            // India VIX has a separate endpoint
            apiUrl = `${NSE_BASE}/api/allIndices`;
        } else {
            apiUrl = `${NSE_BASE}/api/equity-stockIndices?index=${encodeURIComponent(indexName)}`;
        }

        const dataRes = await fetch(apiUrl, {
            headers,
            signal: AbortSignal.timeout(10000),
        });

        if (!dataRes.ok) {
            // Session may have expired — clear cache and report error
            cachedCookies = null;
            cookieExpiry = 0;
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
