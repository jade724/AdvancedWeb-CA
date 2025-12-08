#!/usr/bin/env bash
set -euo pipefail

say() { printf "\n\033[1;32m%s\033[0m\n" "$*"; }
warn() { printf "\n\033[1;33m%s\033[0m\n" "$*"; }
err() { printf "\n\033[1;31m%s\033[0m\n" "$*"; }

USER_NAME="$(whoami)"
DATA_DIR="/opt/homebrew/var/postgresql@17"
PG17_BIN="/opt/homebrew/opt/postgresql@17/bin"
PG_CTL="$PG17_BIN/pg_ctl"
PSQL="$PG17_BIN/psql"

say "🔧 Stopping any running Postgres services"
brew services stop postgresql@14 || true
brew services stop postgresql@17 || true
brew services stop postgresql@18 || true

say "🧹 Undoing any earlier manual symlinks that broke timezone/extensions"
if [ -e /opt/homebrew/share/postgresql@14 ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  sudo mv /opt/homebrew/share/postgresql@14 "/opt/homebrew/share/postgresql@14.broken-$TS"
  warn "Moved /opt/homebrew/share/postgresql@14 -> /opt/homebrew/share/postgresql@14.broken-$TS"
fi

say "🗑  Removing conflicting Homebrew kegs (ignore errors if not installed)"
brew uninstall --force postgresql@14 || true
brew uninstall --force postgresql@18 || true
brew uninstall --force postgis || true

say "📦 Installing PostgreSQL 17 + PostGIS (bottles)"
brew install postgresql@17
brew install postgis

say "🔗 Putting pg@17 first on PATH (will also add to ~/.zshrc)"
if ! grep -q 'postgresql@17/bin' ~/.zshrc 2>/dev/null; then
  echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
fi
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

say "🧰 Ensuring data directory exists and is a valid cluster"
if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
  say "📚 initdb (locale=en_US.UTF-8, UTF8)"
  initdb --locale=en_US.UTF-8 -E UTF8 "$DATA_DIR"
fi

say "🚀 Starting PostgreSQL 17 with brew services"
brew services start postgresql@17

say "⏳ Waiting for server socket..."
for i in {1..30}; do
  if "$PSQL" -U "$USER_NAME" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then break; fi
  sleep 1
done

if ! "$PSQL" -U "$USER_NAME" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
  err "Postgres didn't start. Check: tail -n 200 $DATA_DIR/logfile (if set) or: $PG_CTL -D $DATA_DIR status"
  exit 1
fi

say "👤 Creating roles and database (safe if they already exist)"
$PSQL -U "$USER_NAME" -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';
  END IF;
END
\$\$;

ALTER ROLE "$USER_NAME" WITH SUPERUSER CREATEDB CREATEROLE LOGIN;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'fuelsmart') THEN
    CREATE DATABASE fuelsmart OWNER "$USER_NAME";
  END IF;
END
\$\$;
SQL

say "🧩 Enabling PostGIS"
$PSQL -U "$USER_NAME" -d fuelsmart -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
SQL

say "🔎 Verifying PostGIS"
$PSQL -U "$USER_NAME" -d fuelsmart -c "SELECT PostGIS_Full_Version();"

say "✅ All set. If Django still errors on timezone 'UTC', set TIME_ZONE='Etc/UTC' in settings.py as a fallback."
