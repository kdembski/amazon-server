#!/usr/bin/env bash
# Usage: bash .claude/skills/exclusion-rules/scripts/api.sh <GET|POST|PUT|DELETE> [/<id>] [@<body.json>]
# Calls $AMAZON_API_URL/amazon/exclusion-rules; AMAZON_API_URL comes from the repo's .env.
# Prints the response body to stdout and "HTTP <status>" to stderr; exits non-zero on a 4xx/5xx.
set -euo pipefail

[ -f .env ] && { set -a; . ./.env; set +a; }
: "${AMAZON_API_URL:?Missing AMAZON_API_URL in .env}"

method="$1"
path="${2:-}"
body="${3:-}"

curl -sS --fail-with-body -X "$method" -w '%{stderr}HTTP %{http_code}\n' \
  -H "Content-Type: application/json" ${body:+--data-binary "$body"} \
  "$AMAZON_API_URL/amazon/exclusion-rules$path"
