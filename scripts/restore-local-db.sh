#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-inrise}"
DUMP_PATH="${2:-../_inrise-backup-sql/backup.sql}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@16/bin/psql}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@16/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@16/bin/dropdb}"

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "SQL dump not found: $DUMP_PATH" >&2
  exit 1
fi

echo "Restoring database '$DB_NAME' from '$DUMP_PATH'"

"$DROPDB_BIN" --if-exists "$DB_NAME"
"$CREATEDB_BIN" "$DB_NAME"
"$PSQL_BIN" "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
"$PSQL_BIN" "$DB_NAME" < "$DUMP_PATH"

echo "Restore complete"
