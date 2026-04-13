/**
 * NSE API Proxy Server
 *
 * Deploy this on any VPS with a static IP.
 * Register ONLY that IP with NSE — every caller (local dev, Postman, production) routes through here.
 *
 * How it works:
 *   Client sends:  POST https://<proxy-host>/nsemfdesk/api/v2/reports/ALLOTMENT_STATEMENT
 *                  Headers: Authorization: Basic ..., memberId: ..., X-Proxy-Key: <secret>
 *   Proxy verifies X-Proxy-Key, strips it, forwards to NSE_TARGET_URL, returns NSE response.
 *
 * Environment variables (create proxy/.env from proxy/.env.example):
 *   PROXY_SECRET    — shared secret; must match NSE_PROXY_SECRET in the Next.js app
 *   NSE_TARGET_URL  — https://nseinvestuat.nseindia.com  (UAT) or https://www.nseinvest.com (Prod)
 *   PORT            — default 3001
 *
 * Deploy:
 *   cd proxy && npm install && npm start
 *
 * Or with PM2 for auto-restart:
 *   pm2 start npm --name nse-proxy -- start
 */

import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const PROXY_SECRET = process.env.PROXY_SECRET;
const NSE_TARGET = (process.env.NSE_TARGET_URL || 'https://nseinvestuat.nseindia.com').replace(/\/$/, '');

if (!PROXY_SECRET) {
    console.error('FATAL: PROXY_SECRET env var is not set');
    process.exit(1);
}

// Parse body as raw buffer so we forward it byte-for-byte to NSE
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Auth middleware — reject any request missing the correct shared secret
app.use((req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-proxy-key'];
    if (!key || key !== PROXY_SECRET) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
});

// Health check (no auth required — useful for uptime monitors)
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', target: NSE_TARGET, ts: new Date().toISOString() });
});

// Forward everything else to NSE
app.all('*', async (req: Request, res: Response) => {
    const targetUrl = `${NSE_TARGET}${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    // Build forwarded headers — strip proxy-specific ones
    const forwardHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (['host', 'x-proxy-key', 'connection'].includes(key.toLowerCase())) continue;
        if (typeof value === 'string') forwardHeaders[key] = value;
        else if (Array.isArray(value)) forwardHeaders[key] = value.join(', ');
    }
    forwardHeaders['host'] = new URL(NSE_TARGET).host;

    try {
        const nseRes = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : (req.body as Buffer),
        });

        // Forward NSE response headers (skip hop-by-hop headers)
        const skipHeaders = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade']);
        nseRes.headers.forEach((value, key) => {
            if (!skipHeaders.has(key.toLowerCase())) res.setHeader(key, value);
        });

        res.status(nseRes.status);
        const responseBody = await nseRes.arrayBuffer();
        res.send(Buffer.from(responseBody));

        console.log(`[proxy] ${req.method} ${req.path} → ${nseRes.status}`);
    } catch (err) {
        console.error(`[proxy] Forward failed for ${req.path}:`, err);
        res.status(502).json({ error: 'Bad Gateway — NSE unreachable' });
    }
});

app.listen(PORT, () => {
    console.log(`NSE proxy listening on port ${PORT}`);
    console.log(`Forwarding to: ${NSE_TARGET}`);
});
