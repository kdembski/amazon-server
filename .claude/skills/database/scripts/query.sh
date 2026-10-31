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
port_open() { (exec 3<>/dev/tcp/127.0.0.1/3308) 2>/dev/null; }

# msys `kill` does not stop a hung ssh; taskkill on its Windows pid does.
# shortcut: also closes the tunnel of a query running in parallel, run queries one at a time.
close_tunnel() {
  local pid
  for pid in $(ps -ef | awk '/[s]sh .*-N .*amazon-db/ {print $2}'); do
    taskkill //F //PID "$(cat "/proc/$pid/winpid")" >/dev/null 2>&1 || true
  done
}

# A tunnel left open (possibly dead) holds the port; replace it.
if port_open; then
  close_tunnel
  sleep 1
  port_open && { echo "Port 3308 is held by a process other than the amazon-db tunnel." >&2; exit 1; }
fi
# Background ssh must not hold the caller's stdout/stderr, or the caller waits for it to exit.
ssh -f -N -o BatchMode=yes -o ExitOnForwardFailure=yes amazon-db </dev/null >/dev/null 2>&1 || {
  echo "\`ssh -f -N amazon-db\` failed (see ~/.ssh/config, key ~/.ssh/amazon_db)." >&2
  exit 1
}
trap close_tunnel EXIT

sql="${1:-$(cat)}"
cnf_win="$(cygpath -w "$cnf" 2>/dev/null || echo "$cnf")"

# mysql ignores a world-writable config, which is how Docker Desktop mounts Windows files.
printf '%s\n' "$sql" | MSYS_NO_PATHCONV=1 docker run --rm -i -v "$cnf_win:/in.cnf:ro" mysql:8 sh -c '
  install -m 600 /in.cnf /tmp/my.cnf &&
  exec mysql --defaults-extra-file=/tmp/my.cnf --port=3308 --default-character-set=utf8mb4 \
    --init-command="SET SESSION MAX_EXECUTION_TIME=30000" $1' sh "$format"
