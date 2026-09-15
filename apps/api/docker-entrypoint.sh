#!/bin/sh
set -e
cd /app/apps/api

npx prisma generate

if [ "${RUN_PRISMA_MIGRATE_DEPLOY:-0}" = "1" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "Skipping prisma migrate deploy (set RUN_PRISMA_MIGRATE_DEPLOY=1 to enable)."
fi

exec node dist/index.js
