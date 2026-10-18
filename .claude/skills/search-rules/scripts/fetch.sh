#!/usr/bin/env bash
# Usage: bash fetch.sh <out-dir> <url>...
# Downloads amazon.pl pages; WebFetch gets 503 there, curl with a browser user agent works.
set -u
out="$1"; shift
mkdir -p "$out"
ua="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"

for url in "$@"; do
  file="$out/$(echo "$url" | sed 's#https://www.amazon.pl/##; s#[^A-Za-z0-9]#_#g' | cut -c1-150).html"
  for _ in 1 2 3; do
    [ -s "$file" ] && break
    curl -sL --max-time 40 -A "$ua" -H "Accept-Language: pl-PL,pl;q=0.9" -o "$file" "$url"
    sleep 3
  done
  [ -s "$file" ] || echo "failed: $url" >&2
done
