#!/usr/bin/env bash
set -euo pipefail

echo "→ Applying Prisma migrations..."
npx prisma migrate deploy

echo "→ Ensuring admin exists (if env provided)..."
if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_UID:-}" ]]; then
  # Option 1: seed via script compilé
  if [[ -f "dist/scripts/ensure-admin.js" ]]; then
    node dist/scripts/ensure-admin.js
  fi
else
  echo "ADMIN_EMAIL or ADMIN_UID not set, skipping admin seed."
fi

echo "→ Starting API..."
exec node dist/main.js
