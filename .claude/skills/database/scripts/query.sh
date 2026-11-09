#!/usr/bin/env bash
# Usage: bash ~/.claude/skills/database/scripts/query.sh [--raw] "<SQL>"   (or SQL on stdin)
# Runs read-only queries on the production MySQL as `readonly`, through an SSH tunnel of the `amazon-db` host of
# ~/.ssh/config on the first free port from 3308 up (3307 is left to HeidiSQL). The tunnel is reused by later
# queries and closes itself after IDLE_TIMEOUT without connections.
# --raw prints bare values, one row per line, tab-separated, without headers.
set -euo pipefail

IDLE_TIMEOUT=10m

format="--table"
if [ "${1:-}" = "--raw" ]; then format="--batch --raw --skip-column-names"; shift; fi

cnf="$HOME/.mysql-readonly.cnf"
[ -f "$cnf" ] || { echo "Missing $cnf ([client] host/port/user/password/database)." >&2; exit 1; }

sock="$HOME/.ssh/amazon-db-tunnel.sock"
port_file="$sock.port"
port_open() { (exec 3<>/dev/tcp/127.0.0.1/"$1") 2>/dev/null; }
# -F /dev/null: the mux client must not resend the LocalForward of ~/.ssh/config.
mux() { ssh -F /dev/null -S "$sock" "$@" amazon-db >/dev/null 2>&1; }

if mux -O check && [ -f "$port_file" ]; then
  port="$(cat "$port_file")"
else
  mux -O exit || true
  rm -f "$sock" "$port_file"
  target="$(ssh -G amazon-db 2>/dev/null | awk '$1 == "localforward" {print $3; exit}')"
  [ -n "$target" ] || { echo "No LocalForward in the amazon-db host of ~/.ssh/config." >&2; exit 1; }
  port=3308
  while port_open "$port"; do
    port=$((port + 1))
    [ "$port" -le 3320 ] || { echo "No free port in 3308-3320." >&2; exit 1; }
  done
  # Background ssh must not hold the caller's stdout/stderr, or the caller waits for it to exit.
  ssh -f -N -M -S "$sock" -o ControlPersist="$IDLE_TIMEOUT" -o ClearAllForwardings=yes -o BatchMode=yes \
    amazon-db </dev/null >/dev/null 2>&1 || {
    echo "\`ssh -f -N amazon-db\` failed (see ~/.ssh/config, key ~/.ssh/amazon_db)." >&2
    exit 1
  }
  mux -O forward -L "$port:$target" || { mux -O exit; echo "Forwarding port $port failed." >&2; exit 1; }
  echo "$port" > "$port_file"
fi

sql="${1:-$(cat)}"
cnf_win="$(cygpath -w "$cnf" 2>/dev/null || echo "$cnf")"

# mysql ignores a world-writable config, which is how Docker Desktop mounts Windows files.
printf '%s\n' "$sql" | MSYS_NO_PATHCONV=1 docker run --rm -i -v "$cnf_win:/in.cnf:ro" mysql:8 sh -c '
  install -m 600 /in.cnf /tmp/my.cnf &&
  exec mysql --defaults-extra-file=/tmp/my.cnf --port=$2 --default-character-set=utf8mb4 \
    --init-command="SET SESSION MAX_EXECUTION_TIME=30000" $1' sh "$format" "$port"
