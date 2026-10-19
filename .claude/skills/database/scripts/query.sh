#!/usr/bin/env bash
# Usage: bash .claude/skills/database/scripts/query.sh [--raw] "<SQL>"   (or SQL on stdin)
# Runs read-only queries on the production MySQL as `readonly`, through the SSH tunnel on 127.0.0.1:3307.
# --raw prints bare values, one row per line, tab-separated, without headers.
set -euo pipefail

format="--table"
if [ "${1:-}" = "--raw" ]; then format="--batch --raw --skip-column-names"; shift; fi

cnf="$HOME/.mysql-readonly.cnf"
[ -f "$cnf" ] || { echo "Missing $cnf ([client] host/port/user/password/database)." >&2; exit 1; }
(exec 3<>/dev/tcp/127.0.0.1/3307) 2>/dev/null || {
  echo "Tunnel closed: nothing listens on 127.0.0.1:3307. Open it in HeidiSQL or with plink." >&2
  exit 1
}

sql="${1:-$(cat)}"
cnf_win="$(cygpath -w "$cnf" 2>/dev/null || echo "$cnf")"

# mysql ignores a world-writable config, which is how Docker Desktop mounts Windows files.
printf '%s\n' "$sql" | MSYS_NO_PATHCONV=1 docker run --rm -i -v "$cnf_win:/in.cnf:ro" mysql:8 sh -c '
  install -m 600 /in.cnf /tmp/my.cnf &&
  exec mysql --defaults-extra-file=/tmp/my.cnf --default-character-set=utf8mb4 \
    --init-command="SET SESSION MAX_EXECUTION_TIME=30000" $1' sh "$format"
