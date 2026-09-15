#!/bin/sh
# One-time: mark all local migrations as applied on an existing DB (db push era).
set -e
cd "$(dirname "$0")/.."

npx prisma generate

for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  case "$name" in
    migration_lock.toml) continue ;;
  esac
  echo "Marking applied: $name"
  npx prisma migrate resolve --applied "$name"
done

echo "Done. You can now use: npx prisma migrate deploy"
