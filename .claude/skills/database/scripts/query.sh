#!/usr/bin/env bash
# Usage: bash .claude/skills/database/scripts/query.sh [--raw] "<SQL>"   (or SQL on stdin)
# Runs read-only queries on the production MySQL as `readonly`, through the SSH tunnel on 127.0.0.1:3308
# (opened in the background with the `amazon-db` host of ~/.ssh/config when closed; 3307 is left to HeidiSQL).
# --raw prints bare values, one row per line, tab-separated, without headers.
set -euo pipefail

format="--table"
if [ "${1:-}" = "--raw" ]; then format="--batch --raw --skip-column-names"; shift; fi

cnf="$HOME/.mysql-readonly.cnf"
[ -f "$cnf" ] || { echo "Missing $cnf ([client] host/port/user/password/database)." >&2; exit 1; }
if ! (exec 3<>/dev/tcp/127.0.0.1/3308) 2>/dev/null; then
  # Background ssh must not hold the caller's stdout/stderr, or the caller waits for it to exit.
  ssh -f -N -o BatchMode=yes amazon-db </dev/null >/dev/null 2>&1 || {
    echo "Tunnel closed and \`ssh -f -N amazon-db\` failed (see ~/.ssh/config, key ~/.ssh/amazon_db)." >&2
    exit 1
  }
fi

sql="${1:-$(cat)}"
cnf_win="$(cygpath -w "$cnf" 2>/dev/null || echo "$cnf")"

# mysql ignores a world-writable config, which is how Docker Desktop mounts Windows files.
printf '%s\n' "$sql" | MSYS_NO_PATHCONV=1 docker run --rm -i -v "$cnf_win:/in.cnf:ro" mysql:8 sh -c '
  install -m 600 /in.cnf /tmp/my.cnf &&
  exec mysql --defaults-extra-file=/tmp/my.cnf --port=3308 --default-character-set=utf8mb4 \
    --init-command="SET SESSION MAX_EXECUTION_TIME=30000" $1' sh "$format"
