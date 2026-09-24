import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/nav/history?code=<AMFI scheme code>
 *
 * Returns NAV history in MFAPI's shape ({ data: [{ date: 'DD-MM-YYYY', nav }] }, newest first).
 * MFAPI lags AMFI by several days, so any gap between MFAPI's latest date and today is
 * filled from AMFI's official NAV history report. This keeps recent investment dates
 * (and the "latest NAV") accurate.
 */

const MFAPI_URL = 'https://api.mfapi.in/mf';
const AMFI_HISTORY_URL = 'https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx';
const MAX_GAP_DAYS = 31;
const GAP_CACHE_TTL_MS = 60 * 60 * 1000;

type NavRow = { date: string; nav: string };

const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Cache of parsed AMFI gap reports keyed by "from|to"
const gapCache = new Map<string, { at: number; rows: Map<string, NavRow[]> }>();

function parseDdMmYyyy(s: string): Date {
    const [dd, mm, yyyy] = s.split('-').map(Number);
    return new Date(Date.UTC(yyyy, mm - 1, dd));
}

function toAmfiDate(d: Date): string {
    return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTH_NAMES[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

/** "23-Sep-2026" → "23-09-2026" */
function amfiToDdMmYyyy(s: string): string | null {
    const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m) return null;
    const mm = MONTHS[m[2].toLowerCase()];
    return mm ? `${m[1].padStart(2, '0')}-${mm}-${m[3]}` : null;
}

async function fetchAmfiGap(from: Date, to: Date): Promise<Map<string, NavRow[]>> {
    const key = `${toAmfiDate(from)}|${toAmfiDate(to)}`;
    const cached = gapCache.get(key);
    if (cached && Date.now() - cached.at < GAP_CACHE_TTL_MS) return cached.rows;

    const url = `${AMFI_HISTORY_URL}?frmdt=${toAmfiDate(from)}&todt=${toAmfiDate(to)}`;
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`AMFI history fetch failed: ${res.status}`);
    const text = await res.text();

    // Row: Code;Name;Plan;Option;ISIN Growth;ISIN Reinvest;NAV;Date
    const rows = new Map<string, NavRow[]>();
    for (const line of text.split('\n')) {
        const parts = line.trim().split(';');
        if (parts.length < 4 || !/^\d+$/.test(parts[0])) continue;
        const nav = parseFloat(parts[parts.length - 2]);
        const date = amfiToDdMmYyyy(parts[parts.length - 1]);
        if (!date || !(nav > 0)) continue;
        const list = rows.get(parts[0]) ?? [];
        list.push({ date, nav: String(nav) });
        rows.set(parts[0], list);
    }

    gapCache.clear(); // only the most recent range is useful
    gapCache.set(key, { at: Date.now(), rows });
    return rows;
}

export async function GET(request: NextRequest) {
    const code = new URL(request.url).searchParams.get('code')?.trim();
    if (!code || !/^\d+$/.test(code)) {
        return NextResponse.json({ error: 'Numeric AMFI scheme code required' }, { status: 400 });
    }

    let history: NavRow[] = [];
    let meta: unknown = null;
    try {
        const res = await fetch(`${MFAPI_URL}/${code}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        if (res.ok) {
            const json = await res.json() as { meta?: unknown; data?: NavRow[] };
            history = json.data ?? [];
            meta = json.meta ?? null;
        }
    } catch (err) {
        console.error('[nav/history] MFAPI fetch failed:', err);
    }

    // Fill the gap between MFAPI's latest date (or 31 days ago) and today from AMFI
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const earliest = new Date(todayUtc.getTime() - MAX_GAP_DAYS * 86400000);
    const lastMfapi = history.length ? parseDdMmYyyy(history[0].date) : null;
    let from = lastMfapi ? new Date(lastMfapi.getTime() + 86400000) : earliest;
    if (from < earliest) from = earliest;

    let amfiRows = 0;
    if (from <= todayUtc) {
        try {
            const gap = await fetchAmfiGap(from, todayUtc);
            const fresh = (gap.get(code) ?? [])
                .filter(r => !lastMfapi || parseDdMmYyyy(r.date) > lastMfapi)
                .sort((a, b) => parseDdMmYyyy(b.date).getTime() - parseDdMmYyyy(a.date).getTime());
            amfiRows = fresh.length;
            history = [...fresh, ...history];
        } catch (err) {
            console.error('[nav/history] AMFI gap fill failed:', err);
        }
    }

    if (!history.length) {
        return NextResponse.json({ error: 'No NAV data available for this fund' }, { status: 404 });
    }
    return NextResponse.json({ meta, data: history, amfiFilled: amfiRows });
}
