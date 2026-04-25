# NSE API Proxy — Troubleshooting & Setup Notes

## Architecture

```
Next.js App (nseinvest.ts)
    → Proxy Server (72.60.206.78:3001)
        → NSE Akamai WAF
            → NSE Invest API
```

- `NSE_BASE_URL` → points to the proxy server (not NSE directly)
- `NSE_REFERER_URL` → must always be the real NSE domain (Akamai validates this)
- Proxy strips `X-Proxy-Key`, forwards all other headers to NSE

---

## Bugs Fixed (2026-04-25)

### 1. Referer header pointed to proxy IP instead of NSE domain
**File:** `src/lib/nseinvest.ts`

`Referer` was set to `NSE_BASE_URL` (the proxy IP `http://72.60.206.78:3001`).
Akamai rejects any request where `Referer` is not an NSE domain.

**Fix:** Added `NSE_REFERER_URL` env var. `buildHeaders()` now uses it instead of `NSE_BASE_URL`.

```ts
const NSE_REFERER_URL = process.env.NSE_REFERER_URL ?? 'https://nseinvestuat.nseindia.com';
// in buildHeaders():
Referer: NSE_REFERER_URL,
```

### 2. Proxy had no .env file — crashed on startup
**File:** `proxy/.env` (was missing)

`proxy/server.ts` calls `process.exit(1)` if `PROXY_SECRET` is not set.
Without the file, the proxy never started.

**Fix:** Created `proxy/.env`:
```
PROXY_SECRET=<same value as NSE_PROXY_SECRET in app .env>
NSE_TARGET_URL=https://nseinvestuat.nseindia.com
PORT=3001
```

### 3. Duplicate NSE_BASE_URL in .env
Lines 9 and 14 both set `NSE_BASE_URL`. The second one wins. Removed the first (old UAT URL) to avoid confusion.

---

## Proxy Server Setup (Hostinger VPS)

```bash
# Upload proxy files from local machine
scp -r "/path/to/project/proxy/" root@72.60.206.78:/root/nse-proxy/

# SSH in
ssh root@72.60.206.78

# Install Node 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install dependencies + PM2
cd /root/nse-proxy
npm install
npm install -g pm2

# Start
pm2 start npm --name nse-proxy -- start
pm2 save
pm2 startup   # run the printed command so it survives reboots

# Verify
pm2 status
curl http://localhost:3001/health
# Expected: {"status":"ok","target":"https://nseinvestuat.nseindia.com","ts":"..."}

# Open firewall port if needed
ufw allow 3001
```

---

## Diagnosing Connection Issues

Run these on the VPS in order:

```bash
# 1. Is outbound internet working?
curl -I https://google.com --max-time 10

# 2. Does NSE DNS resolve?
nslookup nseinvestuat.nseindia.com

# 3. Does TCP port 443 connect?
nc -zv nseinvestuat.nseindia.com 443 -w 5

# 4. What is the VPS outbound IP? (must match NSE whitelisted IP)
curl https://api.ipify.org

# 5. Does TLS handshake complete?
openssl s_client -connect nseinvestuat.nseindia.com:443 -servername nseinvestuat.nseindia.com
```

### Result Interpretation

| TCP (nc) | TLS (curl/openssl) | Meaning |
|---|---|---|
| Fails | — | Firewall blocking port 443 outbound |
| Succeeds | Times out | IP not whitelisted — Akamai drops at TLS level |
| Succeeds | TLS error | TLS version mismatch (NSE requires TLS 1.3) |
| Succeeds | 4xx/5xx HTTP | Connected — auth or header issue |
| Succeeds | 200 | Working |

---

## Current Status (2026-04-25)

- Proxy is running and healthy (`/health` responds)
- VPS outbound IP confirmed: `72.60.206.78`
- TCP connects to NSE Akamai successfully
- TLS handshake times out on both UAT and production
- **Root cause: IP not yet active on NSE's Akamai whitelist**

### Action Required

Contact NSE and ask them to confirm:
1. IP `72.60.206.78` is registered and **active** on their whitelist
2. Which environment it applies to — UAT (`nseinvestuat.nseindia.com`) and production (`www.nseinvest.com`) have **separate** whitelists
3. Activation can take 24–48 hours

Once whitelisted, `openssl s_client` will show a complete TLS handshake + certificate chain instead of hanging.

---

## env vars Reference

### App `.env`
```
NSE_BASE_URL=http://72.60.206.78:3001          # proxy server
NSE_REFERER_URL=https://nseinvestuat.nseindia.com  # real NSE domain for Referer header
NSE_PROXY_SECRET=<shared secret>
NSE_LOGIN_USER_ID=ADMIN
NSE_MEMBER_CODE=<member code>
NSE_API_SECRET_KEY=<secret key>
NSE_MEMBER_API_KEY=<member api key>
```

### `proxy/.env` (on VPS)
```
PROXY_SECRET=<same as NSE_PROXY_SECRET above>
NSE_TARGET_URL=https://nseinvestuat.nseindia.com   # change to https://www.nseinvest.com for prod
PORT=3001
```

> When switching to production: update `NSE_TARGET_URL` in `proxy/.env` and `NSE_REFERER_URL` in app `.env` to `https://www.nseinvest.com`, then `pm2 restart nse-proxy`.
