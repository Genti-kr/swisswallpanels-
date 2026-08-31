# Swiss Wall Panels — Final Technical Documentation
**Version 1.0 | Stack Locked | Ready to Build**

---

## 1. Executive Summary

This document is the final, locked specification for the Swiss Wall Panels e-commerce platform. All technology decisions have been made. Every section below is a definitive answer — no alternatives, no maybes. Use this document as the single source of truth before writing any code.

**The platform goal:** A premium, multilingual (de/fr/en/sq) e-commerce site selling decorative and acoustic wall panels to the Swiss market — both B2C (homeowners) and B2B (architects, interior designers). Customers can browse, filter, add to cart, order online with TWINT/Stripe, request quotes, and contact the company.

---

## 2. Final Technology Stack

### 2.1 Frontend — Next.js 14 (App Router)

**Decision: Next.js 14 with App Router. Not plain React.**

Reasoning:
- Server-Side Rendering (SSR) ensures Google indexes every product page in German, French, and English — plain React renders a blank page on first load, destroying SEO rankings
- Static Site Generation (SSG) for the homepage and category pages = instant load, 100 Lighthouse performance score
- `next/image` automatically converts all panel photos to WebP, lazy-loads them, and serves the right size per device — critical for large product photography
- Metadata API generates `hreflang`, `og:`, `twitter:`, and JSON-LD schema tags declaratively per page — SEO is a config option, not a build task
- API Routes in Next.js handle lightweight endpoints (auth, quotes, contact) without a separate server during early development
- Deploys to Vercel in one command — zero DevOps for the frontend

### 2.2 Backend API — Node.js + Express.js

**Decision: Node.js with Express.js as a standalone API server.**

Reasoning:
- Natural pairing with Next.js — same language (TypeScript) across the entire stack
- Handles heavy operations that Next.js API Routes cannot: Stripe webhooks, PDF invoice generation, image processing pipeline, email queuing, Redis caching
- Deployed separately on DigitalOcean VPS — gives full control over server processes (cron jobs, webhook listeners, background tasks)
- Express is intentionally minimal — add only what is needed (no bloat)

### 2.3 Database — MySQL 8.0

**Decision: MySQL 8.0 with Prisma ORM. Not PostgreSQL.**

Reasoning:
- Pre-installed on every VPS host (Hostinger, DigitalOcean) — zero additional setup
- Prisma ORM provides type-safe queries, auto-generated migrations, and a visual database browser (`prisma studio`)
- MySQL 8 JSON column type handles product specifications, translations, and shipping addresses without extra tables
- Built-in FULLTEXT search handles German/French/Italian product search across the catalog
- Proven for e-commerce at scale

**Required MySQL configuration (set on day 1):**
```sql
-- Run after DB creation
ALTER DATABASE swisswallpanels CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET GLOBAL time_zone = 'Europe/Zurich';
```

**Why not PostgreSQL:** No meaningful advantage over MySQL 8 for a product catalog e-commerce platform. PostgreSQL is the right choice only if you later add pgvector for AI semantic search — that migration can happen when needed.

### 2.4 Caching — Redis 7

**Decision: Redis alongside MySQL. Not optional.**

Role: Session storage, rate limiting on auth/contact endpoints, caching product listing queries (so MySQL is not hit on every page load), abandoned cart tracking.

### 2.5 Email — Postmark

**Decision: Postmark for all transactional email.**

Reasoning: Best deliverability in Europe, simple API, pre-built template engine, and detailed send logs. Swiss ISPs are strict — Postmark's reputation means emails land in inbox, not spam.

Emails to implement:
- Order confirmation (fires immediately on payment)
- Quote received (fires when customer submits quote request)
- Quote reply (fires when admin sends a quote)
- Contact auto-reply
- Password reset
- Low stock alert (to admin)
- Abandoned cart recovery (24h after cart abandonment)

### 2.6 Payments — Stripe + TWINT via Datatrans

**Decision: Stripe for card payments, Datatrans as the Swiss payment hub for TWINT and PostFinance.**

- Stripe: Visa, Mastercard, American Express in CHF
- Datatrans: TWINT (dominant Swiss mobile payment), PostFinance Card, PostFinance E-Finance
- All prices stored and displayed in CHF with Swiss formatting: `CHF 1'234.50`

### 2.7 File Storage — Cloudflare R2

**Decision: Cloudflare R2 for all file storage.**

Stores: product images (WebP, multiple sizes), PDF invoices, product datasheets. R2 has no egress fees — unlike AWS S3, you are not charged for every image download. CDN delivery via Cloudflare's global network.

### 2.8 Deployment

| Component | Platform | URL |
|---|---|---|
| Frontend (Next.js) | Vercel | swisswallpanels.ch |
| Backend API (Express) | DigitalOcean Droplet | api.swisswallpanels.ch |
| Database (MySQL) | DigitalOcean Managed DB | Internal only |
| Cache (Redis) | DigitalOcean Managed Redis | Internal only |
| File storage | Cloudflare R2 | cdn.swisswallpanels.ch |
| Email | Postmark | — |
| Payments | Stripe + Datatrans | — |

### 2.9 Development Tools

- **Language:** TypeScript everywhere (Next.js + Express)
- **ORM:** Prisma
- **Linting:** ESLint + Prettier
- **Testing:** Vitest (unit), Playwright (end-to-end)
- **CI/CD:** GitHub Actions → Vercel (frontend) + DigitalOcean (backend)
- **Package manager:** pnpm (faster than npm, better monorepo support)

---

## 3. Auth Chain — Complete Specification

The auth chain is the backbone of cart, orders, quotes, and the admin dashboard. Every step must be built in order.

### 3.1 Auth Flow

```
User registers / logs in
    ↓
Server validates credentials
    ↓
Server issues: Access Token (JWT, 15 min) + Refresh Token (JWT, 7 days)
    ↓
Access Token → stored in memory (React state / Zustand)
Refresh Token → stored in httpOnly cookie (not accessible to JavaScript)
    ↓
Every API request includes Access Token in Authorization header
    ↓
When Access Token expires (15 min):
    → Client sends refresh request with httpOnly cookie
    → Server validates Refresh Token
    → Server issues new Access Token
    ↓
On logout:
    → Refresh Token deleted from DB
    → httpOnly cookie cleared
    → Access Token discarded from memory
```

### 3.2 Why This Structure

- Access Token in memory: never touches localStorage (XSS attack vector), discarded on tab close
- Refresh Token in httpOnly cookie: JavaScript cannot read it — CSRF protection via SameSite=Strict
- 15-minute access token expiry: if a token is stolen, it expires quickly
- Refresh Tokens stored in DB (`refresh_tokens` table): allows admin to invalidate all sessions for a user

### 3.3 User Roles

| Role | Access |
|---|---|
| `guest` | Browse products, add to cart (guest cart), submit quote, contact form |
| `customer` | All guest access + persistent cart, order history, saved addresses, wishlist |
| `b2b` | All customer access + net pricing display, bulk quote requests, project files |
| `admin` | Full admin dashboard: products, orders, quotes, users, analytics |
| `superadmin` | Admin access + user role management, system settings |

### 3.4 Auth Endpoints (Express API)

```
POST   /api/auth/register           Register new customer
POST   /api/auth/login              Login, returns access token + sets refresh cookie
POST   /api/auth/refresh            Exchange refresh cookie for new access token
POST   /api/auth/logout             Clear refresh token from DB and cookie
POST   /api/auth/forgot-password    Send password reset email (requires Postmark)
POST   /api/auth/reset-password     Validate reset token, update password
GET    /api/auth/me                 Return current user from access token
```

### 3.5 Protected Route Middleware (Express)

```typescript
// middleware/auth.ts
export const requireAuth = (roles: string[] = []) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Token expired' });
    }
  };
};

// Usage:
router.get('/admin/orders', requireAuth(['admin', 'superadmin']), getOrders);
router.get('/account/orders', requireAuth(['customer', 'b2b']), getMyOrders);
```

---

## 4. Database Schema (Prisma)

### 4.1 Complete Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String
  firstName         String
  lastName          String
  phone             String?
  companyName       String?
  vatNumber         String?
  role              Role      @default(CUSTOMER)
  preferredLanguage Language  @default(DE)
  newsletterOptIn   Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  addresses         Address[]
  orders            Order[]
  cart              Cart?
  wishlist          Wishlist?
  reviews           Review[]
  quotes            Quote[]
  refreshTokens     RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Address {
  id           String  @id @default(cuid())
  userId       String
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName    String
  lastName     String
  company      String?
  street       String
  houseNumber  String
  postCode     String  // 4-digit Swiss PLZ
  city         String
  canton       String  // 2-letter canton code e.g. ZH, BE, GE
  country      String  @default("CH")
  isDefault    Boolean @default(false)
}

model Category {
  id          String     @id @default(cuid())
  slug        String     @unique
  nameJson    Json       // { de: "Akustikpaneele", fr: "Panneaux acoustiques", en: "Acoustic panels", sq: "Panele akustike" }
  descJson    Json?
  imageUrl    String?
  sortOrder   Int        @default(0)
  parentId    String?
  parent      Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children    Category[] @relation("SubCategories")
  products    Product[]
  createdAt   DateTime   @default(now())
}

model Product {
  id               String           @id @default(cuid())
  slug             String           @unique
  sku              String           @unique
  nameJson         Json             // { de: "...", fr: "...", en: "...", sq: "..." }
  descJson         Json
  specsJson        Json             // { thickness_mm: 12, width_mm: 600, height_mm: 2400, weight_kg: 4.2 }
  acousticRating   Float?           // NRC value 0.0 - 1.0
  fireRatingClass  String?          // e.g. "B-s1,d0" (European fire classification)
  material         String?
  priceChf         Decimal          @db.Decimal(10, 2)
  priceBtwChf      Decimal          @db.Decimal(10, 2)  // B2B net price
  vatRate          Decimal          @default(0.081) @db.Decimal(5, 3)
  stockQuantity    Int              @default(0)
  lowStockAlert    Int              @default(5)
  isFeatured       Boolean          @default(false)
  isActive         Boolean          @default(true)
  sortOrder        Int              @default(0)
  categoryId       String
  category         Category         @relation(fields: [categoryId], references: [id])
  images           ProductImage[]
  variants         ProductVariant[]
  orderItems       OrderItem[]
  cartItems        CartItem[]
  wishlistItems    WishlistItem[]
  reviews          Review[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model ProductVariant {
  id            String     @id @default(cuid())
  productId     String
  product       Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  nameJson      Json       // { de: "Eiche hell 60x240cm", ... }
  sku           String     @unique
  priceChf      Decimal    @db.Decimal(10, 2)
  stockQuantity Int        @default(0)
  attributes    Json       // { color: "oak-light", size: "60x240" }
  isActive      Boolean    @default(true)
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  altJson   Json?
  isPrimary Boolean @default(false)
  sortOrder Int     @default(0)
}

model Cart {
  id        String     @id @default(cuid())
  userId    String?    @unique
  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionId String?    @unique  // For guest carts
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String  @id @default(cuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  variantId String?
  quantity  Int
}

model Order {
  id                   String      @id @default(cuid())
  orderNumber          String      @unique  // e.g. "SWP-2024-00142"
  userId               String?
  user                 User?       @relation(fields: [userId], references: [id])
  guestEmail           String?
  status               OrderStatus @default(PENDING)
  items                OrderItem[]
  shippingAddressJson  Json
  billingAddressJson   Json
  subtotalChf          Decimal     @db.Decimal(10, 2)
  vatAmountChf         Decimal     @db.Decimal(10, 2)
  shippingCostChf      Decimal     @db.Decimal(10, 2)
  discountAmountChf    Decimal     @default(0) @db.Decimal(10, 2)
  totalChf             Decimal     @db.Decimal(10, 2)
  discountCodeId       String?
  discountCode         DiscountCode? @relation(fields: [discountCodeId], references: [id])
  paymentMethod        String      // "stripe" | "twint" | "postfinance"
  stripePaymentIntent  String?
  datatransReference   String?
  invoiceUrl           String?     // Cloudflare R2 URL
  notes                String?
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  statusHistory        OrderStatusHistory[]
}

model OrderItem {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId    String
  product      Product @relation(fields: [productId], references: [id])
  productName  String  // Snapshot at time of order
  variantName  String?
  quantity     Int
  unitPriceChf Decimal @db.Decimal(10, 2)
  totalChf     Decimal @db.Decimal(10, 2)
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  createdAt DateTime    @default(now())
}

model Quote {
  id              String      @id @default(cuid())
  quoteNumber     String      @unique  // e.g. "Q-2024-0089"
  userId          String?
  user            User?       @relation(fields: [userId], references: [id])
  contactName     String
  contactEmail    String
  contactPhone    String?
  company         String?
  projectDesc     String      @db.Text
  roomDimensions  Json?       // { width_m: 4.5, height_m: 2.8, length_m: 6.0 }
  items           QuoteItem[]
  status          QuoteStatus @default(SUBMITTED)
  adminNote       String?     @db.Text
  quotePdfUrl     String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model QuoteItem {
  id          String  @id @default(cuid())
  quoteId     String
  quote       Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  productId   String?
  productName String
  quantity    Int
  note        String?
}

model Wishlist {
  id     String         @id @default(cuid())
  userId String         @unique
  user   User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  items  WishlistItem[]
}

model WishlistItem {
  id         String   @id @default(cuid())
  wishlistId String
  wishlist   Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  addedAt    DateTime @default(now())
}

model Review {
  id        String        @id @default(cuid())
  productId String
  product   Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  rating    Int           // 1-5
  title     String?
  body      String        @db.Text
  status    ReviewStatus  @default(PENDING)
  createdAt DateTime      @default(now())
}

model DiscountCode {
  id            String       @id @default(cuid())
  code          String       @unique
  type          DiscountType
  value         Decimal      @db.Decimal(10, 2)  // % or CHF
  minOrderChf   Decimal?     @db.Decimal(10, 2)
  maxUsesTotal  Int?
  usesCount     Int          @default(0)
  expiresAt     DateTime?
  isActive      Boolean      @default(true)
  orders        Order[]
  createdAt     DateTime     @default(now())
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  subject   String
  message   String   @db.Text
  language  Language @default(DE)
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model NewsletterSubscriber {
  id             String    @id @default(cuid())
  email          String    @unique
  language       Language  @default(DE)
  subscribedAt   DateTime  @default(now())
  confirmedAt    DateTime?
  unsubscribedAt DateTime?
}

// Enums

enum Role {
  GUEST
  CUSTOMER
  B2B
  ADMIN
  SUPERADMIN
}

enum Language {
  DE
  FR
  EN
  SQ
}

enum OrderStatus {
  PENDING
  PAYMENT_CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum QuoteStatus {
  SUBMITTED
  VIEWED
  QUOTED
  ACCEPTED
  REJECTED
  EXPIRED
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

enum DiscountType {
  PERCENT
  FIXED_CHF
}
```

---

## 5. Project Structure

```
swisswallpanels/
├── apps/
│   ├── web/                        # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── [locale]/           # de, fr, en, sq
│   │   │   │   ├── page.tsx        # Homepage
│   │   │   │   ├── produkte/       # Products listing
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx  # Product detail
│   │   │   │   ├── kategorien/     # Category pages
│   │   │   │   ├── projekte/       # Gallery/Projects
│   │   │   │   ├── kontakt/        # Contact
│   │   │   │   ├── offerte/        # Quote request
│   │   │   │   ├── warenkorb/      # Cart
│   │   │   │   ├── kasse/          # Checkout
│   │   │   │   ├── konto/          # User account
│   │   │   │   │   ├── bestellungen/
│   │   │   │   │   ├── merkzettel/
│   │   │   │   │   └── offerten/
│   │   │   │   ├── ueber-uns/      # About
│   │   │   │   └── (legal)/
│   │   │   │       ├── agb/
│   │   │   │       ├── datenschutz/
│   │   │   │       └── impressum/
│   │   │   └── admin/              # Admin dashboard (no locale)
│   │   │       ├── page.tsx        # Dashboard overview
│   │   │       ├── produkte/
│   │   │       ├── bestellungen/
│   │   │       ├── offerten/
│   │   │       ├── benutzer/
│   │   │       └── einstellungen/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui base components
│   │   │   ├── layout/             # Header, Footer, Nav
│   │   │   ├── products/           # ProductCard, ProductGrid, Filters
│   │   │   ├── cart/               # CartDrawer, CartItem, MiniCart
│   │   │   ├── checkout/           # CheckoutForm, PaymentStep, AddressForm
│   │   │   └── shared/             # LanguageSwitcher, CurrencyDisplay, SEO
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed API client (fetch wrapper)
│   │   │   ├── auth.ts             # Auth helpers, token management
│   │   │   ├── cart.ts             # Cart state (Zustand)
│   │   │   └── i18n.ts             # next-intl config
│   │   ├── messages/               # Translation files
│   │   │   ├── de.json
│   │   │   ├── fr.json
│   │   │   ├── en.json
│   │   │   └── sq.json
│   │   └── public/
│   │       └── locales/
│   │
│   └── api/                        # Express.js backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── products.ts
│       │   │   ├── categories.ts
│       │   │   ├── cart.ts
│       │   │   ├── orders.ts
│       │   │   ├── quotes.ts
│       │   │   ├── contact.ts
│       │   │   ├── checkout.ts
│       │   │   ├── webhooks.ts     # Stripe + Datatrans webhooks
│       │   │   └── admin/
│       │   ├── middleware/
│       │   │   ├── auth.ts         # JWT verification
│       │   │   ├── rateLimit.ts    # express-rate-limit
│       │   │   ├── cors.ts
│       │   │   └── upload.ts       # multer + sharp
│       │   ├── services/
│       │   │   ├── email.ts        # Postmark wrapper
│       │   │   ├── stripe.ts       # Stripe service
│       │   │   ├── datatrans.ts    # TWINT/PostFinance
│       │   │   ├── pdf.ts          # Invoice generation
│       │   │   ├── storage.ts      # Cloudflare R2
│       │   │   └── redis.ts        # Cache + rate limit
│       │   └── lib/
│       │       ├── prisma.ts       # Prisma client singleton
│       │       └── swiss.ts        # CHF formatting, PLZ validation, MWST calc
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   └── types/                      # Shared TypeScript types
│       └── index.ts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Test + lint on PR
│       └── deploy.yml              # Deploy on merge to main
│
├── docker-compose.yml              # Local MySQL + Redis
├── .env.example
└── pnpm-workspace.yaml
```

---

## 6. Environment Variables

```bash
# apps/api/.env

# Database
DATABASE_URL="mysql://user:password@localhost:3306/swisswallpanels?charset=utf8mb4"

# JWT
JWT_SECRET="your-256-bit-secret-here"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# Postmark (email)
POSTMARK_API_KEY="your-postmark-key"
POSTMARK_FROM="noreply@swisswallpanels.ch"
ADMIN_EMAIL="info@swisswallpanels.ch"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Datatrans (TWINT/PostFinance)
DATATRANS_MERCHANT_ID="your-merchant-id"
DATATRANS_API_KEY="your-key"
DATATRANS_SIGN_KEY="your-sign-key"

# Cloudflare R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-key"
R2_SECRET_ACCESS_KEY="your-secret"
R2_BUCKET="swisswallpanels-assets"
R2_PUBLIC_URL="https://cdn.swisswallpanels.ch"

# App
NODE_ENV="production"
API_URL="https://api.swisswallpanels.ch"
FRONTEND_URL="https://swisswallpanels.ch"

# apps/web/.env.local
NEXT_PUBLIC_API_URL="https://api.swisswallpanels.ch"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

---

## 7. Build Order — Phase by Phase

Build in this exact order. Each phase unlocks the next.

### Phase 1 — Infrastructure (Week 1)
1. Set up pnpm monorepo with `apps/web` and `apps/api`
2. MySQL 8 running locally via Docker (`docker-compose up`)
3. Redis running locally via Docker
4. Prisma schema written and migrated (`prisma migrate dev`)
5. Express server running with basic health check endpoint
6. Next.js 14 running with locale routing (`/de`, `/fr`, `/en`, `/sq`)

### Phase 2 — Email + Auth (Week 1-2)
1. Postmark account created, domain verified (`swisswallpanels.ch`)
2. Email service wrapper written (`services/email.ts`)
3. Email templates created: order confirmation, password reset, quote received
4. **Test: send a real email from the API**
5. Auth endpoints: register, login, refresh, logout, forgot-password, reset-password
6. JWT middleware written and tested
7. **Test: full auth flow — register → login → refresh → logout**

### Phase 3 — Products + Catalog (Week 2)
1. Products CRUD API (admin only)
2. Image upload pipeline: multer → sharp (WebP) → Cloudflare R2
3. Categories API
4. Products listing API with filters (category, price range, acoustic rating, material)
5. Single product API
6. Next.js product listing page with SSG
7. Next.js product detail page with SSR
8. **Test: add product via API, view on frontend**

### Phase 4 — Cart + Checkout (Week 3)
1. Guest cart (session-based) and authenticated cart (user-based)
2. Cart API: add item, update quantity, remove item, get cart, merge guest → user cart on login
3. Stripe payment intent creation
4. Datatrans TWINT payment session
5. Checkout flow: address → payment selection → payment → confirmation
6. Stripe webhook handler: on `payment_intent.succeeded` → create order → send email → generate invoice
7. Datatrans webhook handler: same flow for TWINT/PostFinance
8. MWST (8.1%) calculation in checkout
9. **Test: full checkout flow with Stripe test card, confirm email arrives**

### Phase 5 — SEO Layer (Week 3-4)
1. Next.js Metadata API on every page (title, description, og:, twitter:)
2. hreflang alternates for all 4 languages on every page
3. JSON-LD Product schema on product detail pages
4. JSON-LD LocalBusiness schema on contact/homepage
5. `sitemap.xml` generated dynamically from DB (all product slugs, category slugs)
6. `robots.txt`
7. **Test: Google Rich Results Test on product page, check hreflang in Search Console**

### Phase 6 — Invoices (Week 4)
1. `@react-pdf/renderer` setup in Express API
2. Swiss-compliant invoice template: CHE VAT number, MWST breakdown, CHF 1'234.50 formatting, Kanton/PLZ address, company logo
3. Invoice generated server-side after order confirmed
4. PDF uploaded to Cloudflare R2
5. Download link included in order confirmation email and user account page
6. **Test: place real test order, verify PDF invoice is correct and downloadable**

### Phase 7 — Quote System + Admin (Week 4-5)
1. Quote request form on frontend (contact info + room dimensions + product selection)
2. Quote saved to DB, admin notified by email
3. Admin quote dashboard: view submissions, add PDF quote, mark as quoted/accepted
4. PDF quote generation (similar to invoice template)
5. Admin product management: create/edit/delete products, upload images
6. Admin order management: view orders, update status, add tracking number
7. Admin analytics: revenue chart, top products, conversion rate

### Phase 8 — Polish + Legal (Week 5-6)
1. Cookie consent banner (blocks analytics until accepted, stores choice)
2. AGB page (Swiss Terms of Service) — de/fr/en/sq
3. Datenschutzerklärung (Privacy policy per DSG) — de/fr/en/sq
4. Impressum — de/fr/en/sq
5. Widerrufsrecht (right of withdrawal) — de/fr/en/sq
6. Product reviews and ratings
7. Wishlist
8. Newsletter subscription with Brevo
9. Abandoned cart email (24h cron job via node-cron)

### Phase 9 — AI + Testing + Deploy (Week 6-7)
1. Claude API chatbot with RAG over product catalog
2. Playwright E2E tests: checkout, quote, contact, admin login
3. Vitest unit tests: MWST calculation, CHF formatting, cart logic, auth middleware
4. GitHub Actions CI pipeline
5. Production deploy: Vercel + DigitalOcean + managed MySQL + managed Redis
6. SSL certificates via Vercel (frontend) and Let's Encrypt (API)
7. Performance audit: Lighthouse ≥ 90 on all core pages
8. Swiss Post address API integration for checkout autocomplete

---

## 8. Key Swiss Business Logic

### 8.1 MWST (VAT) Calculation

```typescript
// packages/types or apps/api/src/lib/swiss.ts

export const MWST_RATE = 0.081; // 8.1% standard Swiss VAT rate

export function calculateMWST(grossPriceChf: number): {
  netPrice: number;
  vatAmount: number;
  grossPrice: number;
} {
  const netPrice = grossPriceChf / (1 + MWST_RATE);
  const vatAmount = grossPriceChf - netPrice;
  return {
    netPrice: Math.round(netPrice * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grossPrice: grossPriceChf,
  };
}
```

### 8.2 CHF Formatting

```typescript
export function formatCHF(amount: number): string {
  // Swiss format: CHF 1'234.50 (apostrophe as thousands separator)
  const formatted = new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
  }).format(amount);
  return formatted; // Intl.NumberFormat with de-CH produces correct Swiss format
}
```

### 8.3 Swiss PLZ (Postal Code) Validation

```typescript
export function validateSwissPLZ(plz: string): boolean {
  return /^\d{4}$/.test(plz) && parseInt(plz) >= 1000 && parseInt(plz) <= 9699;
}

// Swiss cantons for dropdown
export const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' }, { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'AI', name: 'Appenzell Innerrhoden' }, { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' }, { code: 'BE', name: 'Bern' },
  { code: 'FR', name: 'Fribourg' }, { code: 'GE', name: 'Genève' },
  { code: 'GL', name: 'Glarus' }, { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' }, { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuchâtel' }, { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' }, { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' }, { code: 'SZ', name: 'Schwyz' },
  { code: 'SO', name: 'Solothurn' }, { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Ticino' }, { code: 'UR', name: 'Uri' },
  { code: 'VS', name: 'Valais' }, { code: 'VD', name: 'Vaud' },
  { code: 'ZG', name: 'Zug' }, { code: 'ZH', name: 'Zürich' },
];
```

### 8.4 Order Number Generation

```typescript
export async function generateOrderNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } }
  });
  const seq = String(count + 1).padStart(5, '0');
  return `SWP-${year}-${seq}`; // e.g. SWP-2024-00142
}
```

---

## 9. API Reference Summary

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | None | Create account |
| POST | /api/auth/login | None | Login, get tokens |
| POST | /api/auth/refresh | Cookie | Refresh access token |
| POST | /api/auth/logout | Token | Invalidate refresh token |
| POST | /api/auth/forgot-password | None | Send reset email |
| POST | /api/auth/reset-password | None | Reset password |
| GET | /api/auth/me | Token | Get current user |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/products | None | List with filters + pagination |
| GET | /api/products/:slug | None | Single product detail |
| GET | /api/categories | None | All categories |
| POST | /api/admin/products | Admin | Create product |
| PUT | /api/admin/products/:id | Admin | Update product |
| DELETE | /api/admin/products/:id | Admin | Delete product |
| POST | /api/admin/products/:id/images | Admin | Upload images |

### Cart
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/cart | Optional | Get cart (guest or user) |
| POST | /api/cart/items | Optional | Add item |
| PUT | /api/cart/items/:id | Optional | Update quantity |
| DELETE | /api/cart/items/:id | Optional | Remove item |
| DELETE | /api/cart | Optional | Clear cart |

### Checkout
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/checkout/stripe/intent | Optional | Create Stripe payment intent |
| POST | /api/checkout/twint/session | Optional | Create TWINT session |
| POST | /api/webhooks/stripe | None* | Stripe webhook |
| POST | /api/webhooks/datatrans | None* | Datatrans webhook |

*Webhook endpoints validate signatures instead of JWT

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/orders | Customer | My orders |
| GET | /api/orders/:id | Customer | Order detail |
| GET | /api/orders/:id/invoice | Customer | Download invoice PDF |
| GET | /api/admin/orders | Admin | All orders |
| PUT | /api/admin/orders/:id/status | Admin | Update order status |

### Quotes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/quotes | Optional | Submit quote request |
| GET | /api/admin/quotes | Admin | All quote requests |
| PUT | /api/admin/quotes/:id | Admin | Update quote, upload PDF |

---

## 10. SEO Configuration (Next.js)

### 10.1 Metadata per Page

```typescript
// app/[locale]/produkte/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  const name = product.nameJson[params.locale];

  return {
    title: `${name} | Swiss Wall Panels`,
    description: product.descJson[params.locale].substring(0, 155),
    alternates: {
      canonical: `https://swisswallpanels.ch/${params.locale}/produkte/${params.slug}`,
      languages: {
        'de-CH': `https://swisswallpanels.ch/de/produkte/${params.slug}`,
        'fr-CH': `https://swisswallpanels.ch/fr/produits/${params.slug}`,
        'en-CH': `https://swisswallpanels.ch/en/products/${params.slug}`,
        'sq-AL': `https://swisswallpanels.ch/sq/produktet/${params.slug}`,
      },
    },
    openGraph: {
      title: name,
      description: product.descJson[params.locale].substring(0, 155),
      images: [{ url: product.images[0]?.url, width: 1200, height: 630 }],
      locale: `${params.locale}_CH`,
    },
  };
}
```

### 10.2 Product JSON-LD Schema

```typescript
// components/shared/ProductSchema.tsx
export function ProductSchema({ product, locale }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameJson[locale],
    description: product.descJson[locale],
    image: product.images.map(img => img.url),
    sku: product.sku,
    brand: { '@type': 'Brand', name: 'Swiss Wall Panels' },
    offers: {
      '@type': 'Offer',
      price: product.priceChf,
      priceCurrency: 'CHF',
      availability: product.stockQuantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Swiss Wall Panels' },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

---

## 11. Development Prompts — Phase by Phase

Use these prompts in sequence with an AI coding assistant (Claude, Cursor, GitHub Copilot) to build each part of the system.

### Prompt 1 — Project Setup

```
Set up a pnpm monorepo for a Next.js 14 + Express.js e-commerce platform called "Swiss Wall Panels".

Structure:
- apps/web — Next.js 14 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- apps/api — Express.js with TypeScript, Prisma ORM
- packages/types — shared TypeScript interfaces

Requirements:
- pnpm workspace
- ESLint + Prettier configured for both apps
- TypeScript strict mode
- Docker Compose file with MySQL 8 (utf8mb4, Europe/Zurich timezone) and Redis 7
- .env.example with all variables listed in the Swiss Wall Panels documentation

Output: complete file tree, package.json files, tsconfig.json files, docker-compose.yml, and .env.example.
```

### Prompt 2 — Prisma Schema + Migration

```
Create the complete Prisma schema for the Swiss Wall Panels e-commerce platform using MySQL 8.

Include these models: User, RefreshToken, Address, Category, Product, ProductVariant, ProductImage, Cart, CartItem, Order, OrderItem, OrderStatusHistory, Quote, QuoteItem, Wishlist, WishlistItem, Review, DiscountCode, ContactMessage, NewsletterSubscriber.

Key requirements:
- All multilingual text fields use Json columns (nameJson, descJson) storing { de, fr, en, sq } objects
- Products have priceChf and priceBtwChf (B2B net price), vatRate Decimal default 0.081
- Orders store shippingAddressJson and billingAddressJson as Json snapshots
- Enum types: Role (GUEST, CUSTOMER, B2B, ADMIN, SUPERADMIN), Language (DE, FR, EN, SQ), OrderStatus (PENDING, PAYMENT_CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED), QuoteStatus, ReviewStatus, DiscountType
- All monetary values are Decimal @db.Decimal(10,2) in CHF
- Use cuid() for all IDs

Output: complete schema.prisma file ready to run prisma migrate dev.
```

### Prompt 3 — Email Service

```
Build a complete email service for the Swiss Wall Panels platform using Postmark.

File: apps/api/src/services/email.ts

Email functions to implement:
1. sendOrderConfirmation(order, user, locale) — order summary, total CHF, invoice download link
2. sendQuoteReceived(quote) — acknowledgement to customer, admin notification
3. sendQuoteReply(quote, pdfUrl) — send quote PDF to customer
4. sendPasswordReset(user, resetToken, locale) — reset link valid 1 hour
5. sendContactAutoReply(message) — confirmation to contact form submitter
6. sendLowStockAlert(product, currentStock) — to admin email
7. sendAbandonedCart(user, cart, locale) — 24h after cart abandoned

Requirements:
- TypeScript with full type safety
- HTML email templates inline (no external template engine) with Swiss minimalist design
- All customer-facing emails sent in the user's preferred language (de/fr/en/sq)
- Prices formatted as CHF 1'234.50 (Swiss format)
- Error handling: log failures, do not throw (email failure should not crash the order)
- Use POSTMARK_API_KEY and POSTMARK_FROM from environment variables

Output: complete email.ts service file.
```

### Prompt 4 — Auth System

```
Build the complete authentication system for the Swiss Wall Panels Express.js API.

Files to create:
- apps/api/src/routes/auth.ts — all auth endpoints
- apps/api/src/middleware/auth.ts — JWT verification middleware
- apps/api/src/middleware/rateLimit.ts — rate limiting config

Auth endpoints: POST /register, POST /login, POST /refresh, POST /logout, POST /forgot-password, POST /reset-password, GET /me

Security requirements:
- Access Token: JWT, 15 minute expiry, contains { userId, email, role }
- Refresh Token: JWT, 7 day expiry, stored in DB (RefreshToken table) AND sent as httpOnly, SameSite=Strict cookie
- Passwords hashed with bcrypt (12 rounds)
- forgot-password: generate secure random token, store hashed in DB, send email via email service (prompt 3), expire in 1 hour
- Rate limiting: login endpoint max 5 requests per 15 minutes per IP, register max 3 per hour
- requireAuth middleware: extracts and verifies JWT, attaches user to req.user, accepts optional array of allowed roles

Use Prisma client for all DB operations. Use zod for request body validation.

Output: all three files, complete and production-ready.
```

### Prompt 5 — Products API

```
Build the Products and Categories API for the Swiss Wall Panels Express.js backend.

Files: apps/api/src/routes/products.ts, apps/api/src/routes/categories.ts, apps/api/src/middleware/upload.ts

Public endpoints:
- GET /api/products — list products with pagination and filters: category (slug), priceMin, priceMax, acousticRating, material, search (FULLTEXT), sortBy (price_asc, price_desc, newest, featured), page, limit
- GET /api/products/:slug — full product detail including all images, variants, category

Admin endpoints (requireAuth(['ADMIN', 'SUPERADMIN'])):
- POST /api/admin/products — create product
- PUT /api/admin/products/:id — update product
- DELETE /api/admin/products/:id — soft delete (set isActive: false)
- POST /api/admin/products/:id/images — upload product images

Image upload pipeline (upload.ts middleware):
- Accept JPEG, PNG, WebP up to 10MB
- Use multer for multipart handling
- Use sharp to resize to three versions: thumbnail (400x300), medium (800x600), large (1600x1200), all as WebP
- Upload all three to Cloudflare R2 using AWS SDK v3 (R2 is S3-compatible)
- Store URLs in ProductImage table
- Mark first upload as isPrimary if product has no images yet

All responses include multilingual nameJson and descJson. Use Prisma for queries.

Output: complete route files and upload middleware.
```

### Prompt 6 — Cart + Checkout

```
Build the complete cart and checkout system for the Swiss Wall Panels platform.

Files: apps/api/src/routes/cart.ts, apps/api/src/routes/checkout.ts, apps/api/src/routes/webhooks.ts, apps/api/src/services/stripe.ts, apps/api/src/lib/swiss.ts

Cart API (guest + authenticated):
- Guest carts identified by sessionId cookie (UUID, httpOnly)
- On user login: merge guest cart into user cart (add quantities for matching products)
- GET /api/cart — return cart with product details and calculated totals
- POST /api/cart/items — add item (validate stock available)
- PUT /api/cart/items/:id — update quantity (validate stock)
- DELETE /api/cart/items/:id — remove item
- DELETE /api/cart — clear cart

Checkout flow:
- POST /api/checkout/stripe/intent — validate cart, calculate MWST (8.1%), create Stripe PaymentIntent in CHF, return client_secret
- POST /api/checkout/twint/session — create Datatrans transaction for TWINT, return redirect URL

Webhook handlers:
- POST /api/webhooks/stripe — verify Stripe-Signature header, handle payment_intent.succeeded: create Order, create OrderStatusHistory, send order confirmation email, generate invoice PDF, reduce stock quantities, clear cart
- POST /api/webhooks/datatrans — verify signature, same order creation flow

Swiss business logic in swiss.ts:
- calculateMWST(grossPrice): { netPrice, vatAmount, grossPrice }
- formatCHF(amount): string in Swiss format "CHF 1'234.50"
- generateOrderNumber(prisma): "SWP-2024-00142"
- validateSwissPLZ(plz): boolean

Output: all files, complete and ready for Stripe test mode.
```

### Prompt 7 — Next.js Frontend Structure

```
Build the core Next.js 14 frontend for Swiss Wall Panels with App Router, next-intl for 4 languages (de, fr, en, sq), and Tailwind CSS.

Setup requirements:
- next-intl with locale routing: /de, /fr, /en, /sq (default: /de)
- Locale detection from browser Accept-Language header
- Tailwind CSS with custom design tokens: Swiss minimal color palette (white, off-white #F8F8F6, black, dark gray #1A1A1A, accent warm stone #C8B89A)
- shadcn/ui components installed
- Zustand store for cart state

Pages to scaffold (layout + basic structure, no full implementation needed):
- app/[locale]/layout.tsx — Root layout with Header, Footer, LanguageSwitcher
- app/[locale]/page.tsx — Homepage with Hero, FeaturedProducts, AboutSection, GalleryCTA
- app/[locale]/produkte/page.tsx — Products listing with FilterSidebar + ProductGrid
- app/[locale]/produkte/[slug]/page.tsx — Product detail with image gallery, specs, Add to Cart
- app/[locale]/warenkorb/page.tsx — Cart page
- app/[locale]/kasse/page.tsx — Checkout (address + payment)
- app/[locale]/konto/page.tsx — Account dashboard (protected)
- app/admin/page.tsx — Admin dashboard (separate from locale routing)

Components to build:
- Header: logo, navigation (de), language switcher dropdown, cart icon with count badge, mobile hamburger menu
- Footer: links, Swiss address, contact, language links, legal links
- LanguageSwitcher: dropdown showing current language, switches locale preserving path
- ProductCard: image, name (translated), price in CHF, "In Warenkorb" button
- CurrencyDisplay: formats amount as CHF 1'234.50

All text in translation files (messages/de.json etc), no hardcoded strings. Fully responsive (mobile-first).

Output: all layout and page files, component files, translation file structure, and Tailwind config.
```

### Prompt 8 — SEO + Sitemap

```
Add complete SEO configuration to the Swiss Wall Panels Next.js frontend.

Requirements:

1. Metadata API for every page type:
   - Homepage: Swiss Wall Panels title, description in active locale, og:image
   - Product listing: "Wandpaneele kaufen Schweiz" style title
   - Product detail: product name + price, Product og:type, product images
   - Category pages: category name + location (Zürich, Bern, Genève)

2. hreflang alternates on EVERY page — de-CH, fr-CH, en-CH, sq-AL — pointing to the correct URL in each language

3. JSON-LD structured data:
   - Product schema on product detail pages (name, price CHF, availability, sku, image)
   - LocalBusiness schema on homepage and contact page (Swiss address, phone, opening hours)
   - BreadcrumbList schema on product and category pages

4. Dynamic sitemap at /sitemap.xml:
   - All product pages (fetch slugs from API)
   - All category pages
   - All static pages in all 4 locales
   - lastModified from updatedAt
   - Priority: homepage 1.0, categories 0.8, products 0.7, other pages 0.5

5. robots.txt: allow all, disallow /admin, sitemap link

6. next.config.js: security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy)

Output: metadata config, sitemap.ts, robots.ts, JSON-LD components, next.config.js headers.
```

### Prompt 9 — PDF Invoice Generation

```
Build the Swiss-compliant PDF invoice generator for the Swiss Wall Panels backend.

File: apps/api/src/services/pdf.ts

Use @react-pdf/renderer to generate invoices as PDF server-side.

Invoice must include:
- Company header: Swiss Wall Panels logo, company name, address (Zürich), CHE VAT number (MWST-Nr. CHE-xxx.xxx.xxx MWST)
- Invoice number (e.g. RE-SWP-2024-00142), invoice date, order date
- Customer billing address in Swiss format (street + number, PLZ city, canton, Switzerland)
- Order items table: product name, quantity, unit price CHF, total CHF
- Price breakdown: subtotal (excl. MWST), MWST 8.1%, shipping, discount (if any), total in CHF 1'234.50 format
- Payment terms: "Bereits bezahlt" (already paid) with payment method
- Footer: thank you message in order language, company contact details, bank details for reference

Also build: generateQuotePDF(quote) — same template but styled as quote/Offerte instead of invoice, with validity date (30 days), and items without final prices (replace with "auf Anfrage" if no price set)

After generation:
- Upload PDF buffer to Cloudflare R2 at path invoices/{orderId}.pdf
- Return the public CDN URL

Output: complete pdf.ts service with both invoice and quote generators, using @react-pdf/renderer.
```

### Prompt 10 — Admin Dashboard

```
Build the Admin Dashboard for the Swiss Wall Panels Next.js frontend.

Route: /admin/* (no locale prefix, separate from public site)
Access: requireAuth(['ADMIN', 'SUPERADMIN']) — redirect to /admin/login if not authenticated

Pages and features:

/admin — Overview dashboard
  - 4 metric cards: total orders today, revenue this month (CHF), pending quotes, low stock products
  - Revenue chart: last 30 days (line chart with Recharts)
  - Recent orders table: order number, customer, total CHF, status badge, date

/admin/bestellungen — Orders management
  - Filterable, sortable table of all orders
  - Status filter, date range filter, search by order number/customer
  - Click order: detail modal with items, addresses, payment info, status history
  - Update order status dropdown, add tracking number field

/admin/produkte — Product management  
  - Product list with thumbnail, name (de), price, stock, status (active/inactive)
  - "Neues Produkt" button → full product form
  - Product form: name (de/fr/en/sq tabs), description (de/fr/en/sq), price CHF, B2B price, category, material, acoustic rating, fire rating, stock, active toggle
  - Image upload: drag & drop, reorder, set primary, delete

/admin/offerten — Quote requests
  - List of all quote requests with status badges
  - Click: view full quote detail, customer contact info, room dimensions, requested products
  - Actions: "Offerte erstellen" button → generates PDF quote, sends to customer email, marks as QUOTED

Design: clean, minimal, same Tailwind tokens as the public site. Sidebar navigation. All in German (admin is always internal Swiss team).

Output: complete admin layout, all four page components, and reusable admin components (DataTable, StatusBadge, MetricCard).
```

---

## 12. Swiss DSG Compliance Checklist

Before launch, verify every item:

- [ ] Privacy policy published in de, fr, en, sq — covers data collection, processing, retention, and third-party processors (Stripe, Postmark, Google Analytics)
- [ ] Cookie consent banner on first visit — blocks Google Analytics until accepted, stores consent in localStorage
- [ ] AGB (Terms of Service) published in de, fr, en, sq — includes Swiss law jurisdiction (Zürich), return policy, MWST declaration
- [ ] Impressum published: company name, legal address, registered in Handelsregister, VAT number, contact
- [ ] Widerrufsrecht (14-day right of withdrawal) — clearly stated during checkout and in AGB
- [ ] Data deletion endpoint: authenticated users can request account and order data deletion from account settings
- [ ] All email subscribers have explicit opt-in with confirmed double opt-in flow
- [ ] Postmark configured to unsubscribe on bounces and spam reports
- [ ] SSL/HTTPS on all domains and subdomains
- [ ] Admin login 2FA (TOTP) for accounts with ADMIN or SUPERADMIN role

---

## 13. Performance Targets

| Metric | Target | How |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.0s | next/image WebP, Cloudflare CDN, SSG for homepage |
| CLS (Cumulative Layout Shift) | < 0.05 | Explicit image dimensions everywhere |
| FID / INP | < 100ms | Minimal client-side JS, Zustand not Redux |
| Lighthouse Performance | ≥ 90 | SSG + CDN + image optimisation |
| Lighthouse SEO | 100 | Complete metadata, sitemap, structured data |
| Lighthouse Accessibility | ≥ 90 | shadcn/ui components, proper ARIA labels, multilingual |
| Time to First Byte | < 200ms | Vercel Edge Network for Next.js |
| API Response P95 | < 300ms | Redis cache on product listing queries |

---

## 14. Domain Recommendation

**Primary recommendation: `swisswallpanels.ch`**

.ch domains signal Swiss origin to buyers and Google — they rank better in Swiss Google searches than .com domains for local queries. Register via Hostpoint (Swiss registrar) or Infomaniak. Also register `swisswallpanels.com` as a redirect.

**Subdomain plan:**
- `swisswallpanels.ch` — Next.js frontend (Vercel)
- `api.swisswallpanels.ch` — Express API (DigitalOcean)
- `cdn.swisswallpanels.ch` — Cloudflare R2 assets
- `staging.swisswallpanels.ch` — Staging environment

---

*End of documentation. Stack is locked. Build in the order defined in Section 7.*