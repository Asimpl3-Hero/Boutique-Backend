#!/bin/sh
set -e

MAX_RETRIES="${DB_MIGRATE_MAX_RETRIES:-20}"
RETRY_DELAY_SECONDS="${DB_MIGRATE_RETRY_DELAY_SECONDS:-2}"

echo "[entrypoint] Generating Prisma client..."
pnpm prisma generate

echo "[entrypoint] Applying migrations (prisma migrate deploy)..."
attempt=1
while [ "$attempt" -le "$MAX_RETRIES" ]; do
  if pnpm prisma migrate deploy; then
    break
  fi

  if [ "$attempt" -eq "$MAX_RETRIES" ]; then
    echo "[entrypoint] Database not ready after ${MAX_RETRIES} attempts. Exiting."
    exit 1
  fi

  echo "[entrypoint] Database not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_SECONDS}s..."
  attempt=$((attempt + 1))
  sleep "$RETRY_DELAY_SECONDS"
done

# Opt-in: seed the catalog once if it is empty (safe on every redeploy).
if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] SEED_ON_START=true — seeding catalog if empty..."
  SEED_IF_EMPTY=true pnpm db:seed || echo "[entrypoint] Seed skipped/failed (non-fatal)."
fi

echo "[entrypoint] Starting API..."
exec "$@"
