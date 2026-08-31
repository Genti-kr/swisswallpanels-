# Checklist Go-Live Ligjor — Swiss Wall Panels

Plotëso të gjitha fushat më poshtë **para** publikimit komercial në Zvicër.
Çdo placeholder në faqet ligjore përdor formatin `[PLOTËSO: ...]` (sq), `[AUSFÜLLEN: ...]` (de), `[À COMPLÉTER: ...]` (fr), `[FILL IN: ...]` (en).

---

## 1. Të dhëna të kompanisë (Impressum + Footer)

| # | Fusha | Ku përdoret | Plotësuar? |
|---|-------|-------------|------------|
| 1.1 | Emri ligjor i kompanisë (si në regjistër) | Impressum, AGB, Widerruf, Privacy | ☐ |
| 1.2 | Forma ligjore (GmbH / AG / Einzelfirma / Sàrl) | Impressum | ☐ |
| 1.3 | Rruga dhe numri (adresa zyrtare) | Impressum, Widerruf, Privacy | ☐ |
| 1.4 | Kodi postar dhe qyteti | Impressum, Footer | ☐ |
| 1.5 | Numri UID/CHE (TVSH) | Impressum | ☐ |
| 1.6 | Detajet e regjistrit tregtar (kanton, nr.) | Impressum | ☐ |
| 1.7 | Emri i drejtorit / përfaqësuesit të autorizuar | Impressum | ☐ |
| 1.8 | Telefoni | Impressum | ☐ |
| 1.9 | Email kontakti (p.sh. info@...) | Impressum, Widerruf, Privacy | ☐ |
| 1.10 | URL e faqes (www....) | Impressum | ☐ |

**Skedari:** `apps/web/messages/{de,en,fr,sq}.json` → seksioni `Legal`

---

## 2. AGB / Kushtet e përgjithshme

| # | Fusha | Shënim | Plotësuar? |
|---|-------|--------|------------|
| 2.1 | Emri i dyqanit / kompanisë | Në intro dhe seksione | ☐ |
| 2.2 | Vendet e dërgesës | CH vetëm? DE/FR/IT? Lihtenshtajn? | ☐ |
| 2.3 | Politika e transportit | Përputhet me `ShippingRate` në admin? | ☐ |
| 2.4 | Përjashtimet e produkteve (porosi me porosi) | Nëse ka panele të prera sipas matjes | ☐ |
| 2.5 | Rishikim ligjor | Rekomandohet avokat CH për AGB finale | ☐ |

---

## 3. Widerrufsrecht / E drejta e tërheqjes

| # | Fusha | Shënim | Plotësuar? |
|---|-------|--------|------------|
| 3.1 | Adresa për njoftim tërheqjeje | E njëjta si Impressum | ☐ |
| 3.2 | Përjashtimet specifike produkti | Panele të personalizuara / të prera? | ☐ |
| 3.3 | Link në checkout | Verifiko që blerësi e sheh para pagesës | ☐ |

**URL:** `/de/widerruf`, `/en/widerruf`, `/fr/widerruf`, `/sq/widerruf`

---

## 4. Datenschutz / Politika e privatësisë

| # | Fusha | Shënim | Plotësuar? |
|---|-------|--------|------------|
| 4.1 | Email i dedikuar për privatësi | privacy@... ose info@... | ☐ |
| 4.2 | Ofruesi i hostingut | VPS / Vercel / Hetzner etj. | ☐ |
| 4.3 | Periudhat e ruajtjes | Porosi (zakonisht 10 vjet OR), logs | ☐ |
| 4.4 | Verifikim palësh të treta | Stripe, Postmark, Cloudflare R2 — linket janë në template | ☐ |
| 4.5 | Newsletter / marketing | Nëse përdoret Mailchimp, shto në seksionin e tretë | ☐ |

---

## 5. Cookie Consent (DSG)

| # | Veprim | Plotësuar? |
|---|--------|------------|
| 5.1 | Testo banner-in në të 4 gjuhët | ☐ |
| 5.2 | Verifiko që analytics/marketing **nuk** ngarkohen pa pëlqim | ☐ |
| 5.3 | Ekzekuto migrimin `ConsentLog` (shiko më poshtë) | ☐ |
| 5.4 | Vendos `CONSENT_LOG_SALT` në production `.env` | ☐ |

---

## 6. Verifikim para go-live

```text
☐ Të gjitha faqet ligjore pa "John Doe", "CHE-123", "Bahnhofstrasse 100"
☐ Footer përmban: AGB, Widerruf, Datenschutz, Impressum
☐ Checkout referon AGB + Widerruf
☐ Cookie banner shfaqet vetëm herën e parë
☐ POST /api/consent regjistron në DB (pas migrimit)
☐ Rishikim nga jurist zviceran (rekomandohet)
```

---

## Komanda migrimi (ekzekuto manualisht)

```powershell
cd c:\Users\PC\Desktop\nitiPanel\apps\api
npx prisma migrate deploy
npx prisma generate
```

Pastaj rinis API-n dhe testo cookie consent → kontrollo tabelën `ConsentLog`.

---

## Si të plotësosh placeholder-at

**Metoda e re (rekomanduar):** vendos variablat `COMPANY_*` në `apps/web/.env.local` (dhe Vercel production env).

1. Kopjo `company.env.example` → shto fushat në `apps/web/.env.local`
2. Ekzekuto `pnpm validate:company`
3. Rinis web server — Impressum/AGB/Datenschutz/Widerruf plotësohen automatikisht në 4 gjuhë
4. Banner-i amber në Impressum zhduket kur të gjitha fushat e detyrueshme janë plotësuar

**Metoda e vjetër (manual):** redakto `apps/web/messages/de.json` — nuk nevojitet më për fushat e kompanisë.

**Kujdes:** Pas plotësimit, mos commit-o sekrete në git — vetëm tekst ligjor publik.
