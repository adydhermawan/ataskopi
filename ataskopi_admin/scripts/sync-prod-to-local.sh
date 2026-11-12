#!/usr/bin/env bash
# Copy the prod `public` schema (schema + data) into the local Docker DB.
# Prod is only READ (pg_dump). Only the local container is written.
#
# Usage:
#   PROD_DB_URL='postgresql://postgres.<ref>:<pass>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
#     ./scripts/sync-prod-to-local.sh
#
# Use the Supabase *Session pooler* URL (port 5432), not the transaction pooler (6543).
set -euo pipefail

if [ -z "${PROD_DB_URL:-}" ]; then
  # Drop any lines pasted together with the command, then read from the keyboard.
  while read -r -t 1 _junk < /dev/tty; do :; done
  printf "Paste prod Supabase Session pooler URL (hidden), then Enter: " > /dev/tty
  read -rs PROD_DB_URL < /dev/tty; echo > /dev/tty
fi
# Trim whitespace and surrounding quotes.
PROD_DB_URL="$(printf '%s' "$PROD_DB_URL" | sed -E "s/^[[:space:]'\"]+//; s/[[:space:]'\"]+\$//")"
case "$PROD_DB_URL" in
  *"<"*|*">"*) echo "PROD_DB_URL still contains <placeholders>; paste the real URL from Supabase > Connect." >&2; exit 1 ;;
  postgres://*|postgresql://*) ;;
  *) echo "PROD_DB_URL must start with postgresql://" >&2; exit 1 ;;
esac
LOCAL_CONTAINER="${LOCAL_CONTAINER:-ataskopi_db}"
PG_IMAGE="${PG_IMAGE:-postgres:17}"   # pg_dump must be >= prod server version
OUT_DIR="${OUT_DIR:-$(pwd)/.db-dumps}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"

case "$PROD_DB_URL" in
  *127.0.0.1*|*localhost*) echo "PROD_DB_URL points to localhost; refusing." >&2; exit 1 ;;
esac

echo "==> 1/4 Backing up local public schema -> $OUT_DIR/local-backup-$STAMP.dump"
docker exec "$LOCAL_CONTAINER" pg_dump -U postgres -d postgres --schema=public -Fc \
  > "$OUT_DIR/local-backup-$STAMP.dump"

echo "==> 2/4 Dumping prod public schema (read-only) -> $OUT_DIR/prod-$STAMP.dump"
docker run --rm -e PGURL="$PROD_DB_URL" "$PG_IMAGE" \
  sh -c 'pg_dump "$PGURL" --schema=public --no-owner --no-privileges -Fc' \
  > "$OUT_DIR/prod-$STAMP.dump" || { rm -f "$OUT_DIR/prod-$STAMP.dump"; echo "Prod dump failed; local DB untouched." >&2; exit 1; }
[ -s "$OUT_DIR/prod-$STAMP.dump" ] || { rm -f "$OUT_DIR/prod-$STAMP.dump"; echo "Prod dump is empty; local DB untouched." >&2; exit 1; }
ls -lh "$OUT_DIR/prod-$STAMP.dump"

echo "==> 3/4 Replacing local public schema"
docker exec "$LOCAL_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role; GRANT USAGE ON SCHEMA public TO public;"

echo "==> 4/4 Restoring prod dump into local"
# Restore with the same pg_restore version as pg_dump; the local container's v15 can't read v17 dumps.
LOCAL_URL="$(grep -E '^POSTGRES_URL_NON_POOLING=' .env | cut -d= -f2- | tr -d '"' \
  | sed 's/127\.0\.0\.1/host.docker.internal/; s/localhost/host.docker.internal/; s/?schema=public//')"
case "$LOCAL_URL" in *host.docker.internal*) ;; *) echo "Local URL in .env is not localhost; refusing." >&2; exit 1 ;; esac
docker run --rm -v "$OUT_DIR:/d:ro" -e LURL="$LOCAL_URL" "$PG_IMAGE" \
  sh -c "pg_restore -d \"\$LURL\" --no-owner --no-privileges /d/prod-$STAMP.dump" 2> "$OUT_DIR/restore-$STAMP.log" || true
# Ignore the two known-harmless errors (PG17-only SET, pre-created schema); fail on anything else.
if grep -E '^pg_restore: error' "$OUT_DIR/restore-$STAMP.log" | grep -vE 'transaction_timeout|schema "public" already exists' | grep -q .; then
  cat "$OUT_DIR/restore-$STAMP.log" >&2; echo "Restore failed; see above." >&2; exit 1
fi

docker exec "$LOCAL_CONTAINER" psql -U postgres -d postgres -tAc \
  "select relname, n_live_tup from pg_stat_user_tables where schemaname='public' order by n_live_tup desc limit 15;"

echo
echo "==> Re-adding this branch's unreleased schema (POS) to LOCAL via prisma db push"
grep -qE '^POSTGRES_PRISMA_URL=.*(127\.0\.0\.1|localhost)' .env \
  && npx prisma db push --accept-data-loss \
  || echo "Skipped: .env POSTGRES_PRISMA_URL is not localhost. Run 'npx prisma db push' manually if safe."

echo
echo "Done. Local now mirrors prod (+ branch schema)."
echo "Restore the old local DB with:"
echo "  docker exec -i $LOCAL_CONTAINER pg_restore -U postgres -d postgres --clean --if-exists --no-owner < $OUT_DIR/local-backup-$STAMP.dump"
