# NSE Proxy — Command Reference

> All PM2 commands run on the VPS (`ssh root@72.60.206.78`).
> The PM2 process name is **`nse-proxy`**.

---

## SSH into VPS

```bash
ssh root@72.60.206.78
cd /root/nse-proxy
```

---

## PM2 Lifecycle

| Action | Command |
|---|---|
| **Start** | `pm2 start npm --name nse-proxy -- start` |
| **Stop** | `pm2 stop nse-proxy` |
| **Restart** | `pm2 restart nse-proxy` |
| **Delete** (remove from PM2 list) | `pm2 delete nse-proxy` |
| **Reload** (zero-downtime) | `pm2 reload nse-proxy` |

---

## PM2 Monitoring

| Action | Command |
|---|---|
| List all processes | `pm2 list` |
| Status of proxy | `pm2 show nse-proxy` |
| Live logs (follow) | `pm2 logs nse-proxy` |
| Last 100 lines | `pm2 logs nse-proxy --lines 100` |
| Error logs only | `pm2 logs nse-proxy --err` |
| Real-time dashboard | `pm2 monit` |
| Flush all logs | `pm2 flush nse-proxy` |

---

## PM2 Persistence (survive reboots)

```bash
# Save current process list
pm2 save

# Generate startup script (run the printed command)
pm2 startup

# Remove startup script
pm2 unstartup systemd
```

---

## Health Check

```bash
# From VPS
curl http://localhost:3001/health

# From local machine
curl http://72.60.206.78:3001/health
```

Expected response:
```json
{"status":"ok","target":"https://nseinvestuat.nseindia.com","ts":"..."}
```

---

## Deploy / Update Proxy

```bash
# From local machine — upload files to VPS
scp -r proxy/ root@72.60.206.78:/root/nse-proxy/

# SSH in and restart
ssh root@72.60.206.78
cd /root/nse-proxy
npm install
pm2 restart nse-proxy
```

---

## Running Without PM2 (dev / debug)

```bash
# Standard start
cd /root/nse-proxy
npm start

# Watch mode (auto-restart on file changes)
npm run dev
```

---

## Switching UAT ↔ Production

Edit `proxy/.env` on the VPS:

```bash
nano /root/nse-proxy/.env
```

| Environment | `NSE_TARGET_URL` |
|---|---|
| UAT | `https://nseinvestuat.nseindia.com` |
| Production | `https://www.nseinvest.com` |

Then restart:
```bash
pm2 restart nse-proxy
```

> Also update `NSE_REFERER_URL` in the Next.js app `.env` to match.

---

## Diagnosing Issues

```bash
# Check if proxy is running
pm2 status

# Check proxy logs for errors
pm2 logs nse-proxy --lines 50

# Test outbound connectivity from VPS
curl -I https://google.com --max-time 10

# Test NSE DNS resolution
nslookup nseinvestuat.nseindia.com

# Test TCP to NSE
nc -zv nseinvestuat.nseindia.com 443 -w 5

# Test TLS handshake
openssl s_client -connect nseinvestuat.nseindia.com:443 -servername nseinvestuat.nseindia.com

# Check VPS outbound IP (must match NSE whitelist)
curl https://api.ipify.org
```

---

## Firewall

```bash
# Open proxy port
ufw allow 3001

# Check firewall status
ufw status
```
