# Deploy Guide — Swiss Wall Panels (Faza 6)

Arkitektura e rekomanduar:

| Komponent | Platformë | URL shembull |
|-----------|-----------|--------------|
| **Web** (Next.js) | Vercel | `https://swisswallpanels.ch` |
| **API** (Express) | VPS / Docker + PM2 | `https://api.swisswallpanels.ch` |
| **MySQL** | Managed (PlanetScale, Hetzner, RDS) | private host |
| **Imazhe** | Cloudflare R2 + CDN | `https://cdn.swisswallpanels.ch` |

---

## 1. Para deploy-it

1. Plotëso `company.env.example` → `apps/web/.env.local` (dhe Vercel env) me të dhëna reale
2. Verifiko: `pnpm validate:company`
3. Plotëso checklist ligjore: `LEGAL_GOLIVE_CHECKLIST.md`
4. Konfiguro integrimet: `PRODUCTION_SETUP.md` (Stripe, Postmark, R2)
5. Sigurohu që CI kalon në GitHub Actions (`ci.yml`)

---

## 2. Web — Vercel

### Konfigurimi i projektit
- **Root Directory:** `apps/web`
- **Framework:** Next.js (auto)
- **Region:** Frankfurt (`fra1`) — shiko `apps/web/vercel.json`

### Environment Variables (Vercel Dashboard)
Kopjo nga `apps/web/.env.production.example`:

```
NEXT_PUBLIC_SITE_URL=https://swisswallpanels.ch
NEXT_PUBLIC_API_URL=https://api.swisswallpanels.ch
INTERNAL_API_URL=https://api.swisswallpanels.ch
AUTH_SECRET=<32+ chars>
JWT_SECRET=<same or separate>
NEXTAUTH_URL=https://swisswallpanels.ch
FRONTEND_URL=https://swisswallpanels.ch
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.swisswallpanels.ch
NEXT_PUBLIC_CDN_HOSTNAME=cdn.swisswallpanels.ch
DATABASE_URL=mysql://...
POSTMARK_API_KEY=...
POSTMARK_FROM=noreply@...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...
```

### Deploy
```bash
# Nga lokal (me Vercel CLI)
cd apps/web
vercel --prod
```

Ose lidh repo-n me Vercel — çdo push në `main` deploy-on automatikisht.

---

## 3. API — VPS (Docker + Caddy SSL) — rekomanduar

```bash
# Në VPS, pas DNS: api.swisswallpanels.ch → IP e serverit
export API_DOMAIN=api.swisswallpanels.ch
export ACME_EMAIL=info@swisswallpanels.ch
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy merr automatikisht certifikatë Let's Encrypt (HTTPS).

### API — VPS (PM2) — alternativë

### Kërkesat e serverit
- Node.js 20+
- pnpm 9+
- PM2 (`npm i -g pm2`)
- MySQL i arritshëm nga VPS

### Environment
Kopjo `apps/api/.env.production.example` → `apps/api/.env` në server.

### Deploy me script
```bash
# Në VPS, nga root i repo-së
chmod +x scripts/deploy-api.sh
./scripts/deploy-api.sh
```

Script-i:
1. `pnpm install --frozen-lockfile`
2. `prisma generate`
3. **`prisma migrate deploy`** ← automatik, jo manual
4. `pnpm --filter api build`
5. `pm2 reload ecosystem.config.cjs`

### PM2 manual
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # autostart pas reboot
```

### Nginx reverse proxy (shembull)
```nginx
server {
  listen 443 ssl http2;
  server_name api.swisswallpanels.ch;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 20M;
  }
}
```

---

## 4. API — Docker (alternativë)

```bash
cd apps/api
docker build -t swisswall-api .
docker run -d \
  --name swisswall-api \
  -p 3001:3001 \
  --env-file .env \
  -v swisswall-uploads:/app/apps/api/uploads \
  swisswall-api
```

Dockerfile ekzekuton `prisma migrate deploy` para start-it.

---

## 5. Migrimet e databazës (CI/CD)

### Në CI (test)
`ci.yml` ekzekuton `prisma migrate deploy` automatikisht.

### Në production (GitHub Actions)
Workflow `deploy.yml` — manual trigger:
1. GitHub → Actions → **Deploy**
2. Aktivizo **Run prisma migrate deploy**
3. Kërkon secret `DATABASE_URL` në environment `production`

### Lokal / VPS
```bash
pnpm deploy:migrate
```

**Mos përdor** `prisma migrate dev` në production.

---

## 6. Monitoring — Sentry (opsional)

1. Krijo projekt në [sentry.io](https://sentry.io) (Next.js + Node)
2. Vendos DSN:
   - API: `SENTRY_DSN` në `apps/api/.env`
   - Web: `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` në Vercel
3. Pa DSN → monitoring çaktivizohet automatikisht (zero overhead)

### Uptime monitor
Konfiguro një ping çdo 5 min te:
```
GET https://api.swisswallpanels.ch/api/health
```
Pritet: `{ "status": "ok", "db": "ok" }`

Shërbime falas: UptimeRobot, Better Stack, HetrixTools.

---

## 7. Stripe Webhook në production

URL: `https://api.swisswallpanels.ch/api/webhooks/stripe`

Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`

---

## 8. Checklist pas deploy

```
☐ https://swisswallpanels.ch/de ngarkon
☐ https://api.swisswallpanels.ch/api/health → status ok, db ok
☐ Login / register funksionon
☐ Checkout me Stripe test/live
☐ Webhook Stripe merr evente
☐ Email konfirmimi dërgohet (Postmark)
☐ Imazhe nga CDN (R2)
☐ Admin /admin/login
☐ Sentry kap një error test (opsional)
☐ Uptime alert aktiv
```

---

## 9. Input që duhet nga ti

| Item | Ku vendoset |
|------|-------------|
| Domain DNS (swisswallpanels.ch, api., cdn.) | Cloudflare / registrar |
| MySQL production `DATABASE_URL` | VPS env + GitHub secret |
| Stripe live keys + webhook | API `.env` |
| Postmark verified domain | API + Web env |
| R2 bucket + CDN | API env |
| Sentry DSN | API + Vercel env |
| Të dhëna ligjore reale | `LEGAL_GOLIVE_CHECKLIST.md` |

Kur të kesh këto gati, mund të bëjmë një **deploy test** së bashku hap pas hapi.
