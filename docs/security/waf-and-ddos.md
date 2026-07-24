# Security Hardening — WAF / DDoS

BLACKANDBREW ERP uses **Vercel Firewall** as the primary edge protection layer. Cloudflare is optional if you terminate DNS elsewhere.

## Vercel Firewall (recommended)

### Current project status

- **Firewall:** enabled on `black-and-brew` (`firewallEnabled: true`)
- **Default CRS rules:** active in **log** mode (sqli, xss, rce, gen)
- **Premium managed rules** in `config/vercel-firewall.json` (OWASP deny, bot challenge, etc.) require a Vercel plan that includes the OWASP Core Ruleset. On Hobby/lower tiers the API returns `401 OWASP Core Ruleset is not available for this plan`.

### What the config targets

`config/vercel-firewall.json` enables (when plan allows):

| Layer | Action |
| --- | --- |
| OWASP Core Rule Set | deny |
| Bot protection | challenge |
| AI bot blocking | deny |
| Vercel managed ruleset | deny |
| Suspicious traffic sources | deny |
| `POST /api/chat` edge rate limit | 30 req / 60s |
| Empty user-agent on `/api/*` | deny |

System DDoS mitigations are on by default on Vercel. Do **not** pause them unless debugging a false positive:

```bash
vercel firewall system-mitigations resume --yes
```

### Apply configuration

1. Create/link an [Upstash Redis](https://upstash.com/) database (for app-level distributed rate limits — separate from firewall).
2. Ensure Vercel CLI is authenticated: `vercel login`
3. Link the repo (`vercel link`) so `.vercel/project.json` supplies `projectId` and `orgId` (team), or pass `--project` / `--team`
4. Apply:

```bash
npm run security:firewall:apply
```

Dry run:

```bash
node scripts/apply-vercel-firewall.mjs --dry-run --project <VERCEL_PROJECT_ID>
```

### Attack mode (incident response)

If under active abuse, enable Attack Mode for 1–24 hours:

```bash
vercel firewall attack-mode enable --duration 6h --yes
```

Disable when traffic normalizes:

```bash
vercel firewall attack-mode disable --yes
```

### Verify blocked traffic

```bash
vercel logs --status-code 403 --json
```

Look for `proxy.firewallAction` in the JSON output.

### In-app security alerts (PIN lockout)

With **Settings → แจ้งเตือนความปลอดภัย** enabled, the app records `pin_lockout` rows in `data_change_logs` when an IP fails PIN verification 5 times within 15 minutes. Staff see FAB panel + Web Push alerts (no extra env vars beyond existing VAPID/Supabase).

## Cloudflare (optional)

Use Cloudflare only when your domain DNS is **not** on Vercel nameservers.

Minimum recommended settings:

1. **SSL/TLS** → Full (strict)
2. **Security** → Bot Fight Mode ON
3. **WAF** → OWASP ruleset ON
4. **Rate limiting rule** → `POST /api/chat` → 30 requests / minute / IP
5. **Rate limiting rule** → `POST /api/*` auth-sensitive routes → stricter thresholds
6. **DDoS** → sensitivity High

Do not double-proxy Vercel + Cloudflare on the same hostname unless you understand cache and header implications.

## Distributed app rate limits (Upstash)

Set on Vercel (Production + Preview):

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |

Without these variables the app falls back to in-memory limits (per serverless instance).

Protected surfaces:

- PIN failures — 5 / 15 min per IP
- AI chat — 30 / hour per user
- Tavily search — 10 / hour per user

## Related docs

- [RLS audit](./rls-audit.md)
- [API routes](../api.md)
