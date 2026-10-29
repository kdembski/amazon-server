#!/usr/bin/env bash
# Usage: bash .claude/skills/exclusion-rules/amazon/api.sh <GET|POST|PUT|DELETE> [/<id>] [@<body.json>]
# Calls $API_URL/amazon/exclusion-rules; API_URL comes from the repo's .env.
# Prints the response body to stdout and "HTTP <status>" to stderr; exits non-zero on a 4xx/5xx.
set -euo pipefail

[ -f .env ] && { set -a; . ./.env; set +a; }
: "${API_URL:?Missing API_URL in .env}"
: "${API_TOKEN:?Missing API_TOKEN in .env}"

method="$1"
path="${2:-}"
body="${3:-}"

curl -sS --fail-with-body -X "$method" -w '%{stderr}HTTP %{http_code}\n' \
  -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" ${body:+--data-binary "$body"} \
  "$API_URL/amazon/exclusion-rules$path"
