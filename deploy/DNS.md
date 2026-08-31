# DNS records (Cloudflare or registrar)
# swisswallpanels.ch        A/CNAME → Vercel
# api.swisswallpanels.ch    A       → VPS IP (Docker Caddy)
# cdn.swisswallpanels.ch    CNAME   → R2 custom domain

# --- Web (Vercel) ---
# Root: apps/web
# Region: fra1 (see apps/web/vercel.json)
# Env: apps/web/.env.production.example + all COMPANY_* from company.env.example

# --- API (VPS + Docker) ---
# docker compose -f docker-compose.prod.yml up -d --build
# Health: https://api.swisswallpanels.ch/api/health

# --- Pre-deploy checks ---
# pnpm validate:company
# pnpm build:prod
# pnpm test:e2e-checkout   (against staging API)
