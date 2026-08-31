#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Generating Prisma client"
pnpm --filter api exec prisma generate

echo "==> Applying database migrations"
pnpm --filter api exec prisma migrate deploy

echo "==> Building API"
pnpm --filter api build

echo "==> Reloading PM2"
mkdir -p logs
if pm2 describe swisswall-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save
echo "==> API deploy complete"
