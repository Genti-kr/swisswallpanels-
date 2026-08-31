# Production Setup Guide — Swiss Wall Panels

Ky dokument shpjegon si të konfigurosh Stripe, Postmark dhe R2 **kur të kesh llogaritë**.
Deri atëherë, projekti funksionon në dev me fallback lokal (uploads/, email në console).

---

## Statusi aktual (pa llogari)

| Shërbim | Dev (tani) | Production (kërkon llogari) |
|---------|------------|----------------------------|
| **Stripe** | Checkout Stripe kthen gabim "not configured" | `sk_live_`, `pk_live_`, webhook |
| **Postmark** | Email shfaqen në console API | Dërgesë reale transaksionale |
| **R2** | Imazhet ruhen në `apps/api/uploads/` | CDN `cdn.swisswallpanels.ch` |

---

## 1. Stripe (pagesa)

### Hapat
1. Krijo llogari në [stripe.com](https://stripe.com) (Zvicër)
2. Aktivizo **TWINT** në Dashboard → Settings → Payment methods
3. Merr çelësat:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (web)
   - **Secret key** → `STRIPE_SECRET_KEY` (vetëm API)
4. Krijo **Webhook**:
   - URL: `https://api.swisswallpanels.ch/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `checkout.session.completed`, `checkout.session.async_payment_failed`
   - Kopjo **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Test E2E (API + Stripe test card)
```powershell
# Terminal 1: API
pnpm dev:api

# Terminal 2: test automatik
pnpm test:e2e-checkout
```
Verifikon: cart → checkout → totals server-side → Stripe `pm_card_visa` → `verify-payment` → DB `PAID` → fatura jo publike.

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Kopjo whsec_... në .env si STRIPE_WEBHOOK_SECRET
```

### Flow i konfirmimit
1. Klienti paguan → Stripe `confirmPayment`
2. Frontend thërret `verify-payment` me retry (deri 5 herë)
3. Webhook `payment_intent.succeeded` konfirmon porosinë në DB
4. Email konfirmimi dërgohet (Postmark)

---

## 2. Postmark (email)

### Hapat
1. Krijo llogari në [postmarkapp.com](https://postmarkapp.com)
2. Verifiko domenin (SPF, DKIM, Return-Path)
3. Krijo **Server** → kopjo **Server API token** → `POSTMARK_API_KEY`
4. Vendos `POSTMARK_FROM=noreply@domeni-yt.ch` (adresa e verifikuar)

### Template që dërgohen automatikisht
- Konfirmim porosie
- Reset fjalëkalimi / verifikim email
- Njoftim admin për porosi të re
- Njoftim dërgese (status update)

### Test
```powershell
cd apps/api
npm run dev
# Bëj një porosi test — shiko Postmark Activity
```

---

## 3. Cloudflare R2 (imazhe + CDN)

### Hapat
1. Cloudflare Dashboard → R2 → Create bucket `swisswallpanels-assets`
2. Krijo **API token** (R2 read/write) → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
3. `R2_ACCOUNT_ID` nga dashboard
4. Lidh **custom domain** (p.sh. `cdn.swisswallpanels.ch`) → `R2_PUBLIC_URL`
5. Vendos në web: `NEXT_PUBLIC_R2_PUBLIC_URL` dhe `NEXT_PUBLIC_CDN_HOSTNAME`

### Dev vs prod
- **Pa R2**: imazhet në `apps/api/uploads/` (lokal)
- **Me R2**: upload automatik nga admin → CDN URL

### Fallback imazh
Nëse URL mungon ose imazhi dështon: `/Enhancing-Wood-Panel-Walls.webp`

---

## 4. Variablat e detyrueshëm në production

API (`apps/api/.env`) — shiko `.env.production.example`:
```
DATABASE_URL, JWT_SECRET, API_URL, FRONTEND_URL,
STRIPE_*, POSTMARK_*, R2_*, CONSENT_LOG_SALT
```

Web (Vercel env vars) — shiko `apps/web/.env.production.example`:
```
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_API_URL, INTERNAL_API_URL,
AUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

**API nuk starton në production** pa këto — `validateProductionEnv()` bllokon startup-in.

### Siguri para go-live
- Faturat PDF **nuk** shërbehen publikisht — vetëm me token (`/api/orders/:id/invoice`)
- Checkout pranon vetëm pagesa online (Stripe/TWINT/kartë) në production
- `SEED_DEMO_USERS=false` — mos krijo llogari demo në prod
- Vendos `ADMIN_IP_WHITELIST` për `/api/admin` nëse API është publik

---

## 5. Çfarë NUK duhet në client bundle

✅ Vetëm `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
❌ Kurrë `STRIPE_SECRET_KEY`, `POSTMARK_API_KEY`, `R2_SECRET_*`, `JWT_SECRET`

---

## 6. Checklist para go-live

```
☐ Stripe live keys + webhook testuar
☐ Postmark domain verified + test email
☐ R2 bucket + CDN domain aktiv
☐ .env.production pa localhost
☐ Porosi test: pagesë → webhook → email → status PAID në admin
☐ Impressum/AGB plotësuar me të dhëna reale (UID, adresë)
☐ SEED_DEMO_USERS=false në prod
☐ ADMIN_IP_WHITELIST aktiv (nëse API publik)
```

---

## Kur të kesh llogaritë

Më dërgo:
1. A ke domain-in gati (`swisswallpanels.ch`)?
2. Stripe test apo direkt live?
3. Postmark token (jo në chat — vetëm konfirmo që e ke)

Unë mund të ndihmoj me konfigurimin e webhook URL dhe testimin e flow-it.

---

## 7. Deploy në production

Shiko **`DEPLOY.md`** për:
- Vercel (web) + VPS/Docker (API)
- `prisma migrate deploy` në CI/CD
- Sentry + uptime monitoring
- Checklist pas go-live
