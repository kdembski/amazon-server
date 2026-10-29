# Exclusion rules: Amazon

## Data

- Rules: `AmazonExclusionRule`; ads: `AmazonAd` (`name`, `excluded`, `scrapedAt`, `categoryId`, by `asin`; `name`
  has no index); categories: `AmazonAdCategory` (`active`).
- API: `/amazon/exclusion-rules` (`GET`, `POST`, `PUT|DELETE /:id`, `POST /batch`).

## Demand sources (amazon.pl)

- Signals: review count, "X+ kupionych w ciągu ostatniego miesiąca", bestsellers; rating "4,5 z 5 gwiazdek".
- Brand field: "Marka" / "Odwiedź sklep" line.
- Child categories: `child-nodes.js` on a bestsellers page.
- URLs:
  - `https://www.amazon.pl/s?i=<root>&rh=n%3A<node id>&s=exact-aware-popularity-rank&page=<n>`
  - `https://www.amazon.pl/s?k=<words>&s=exact-aware-popularity-rank&page=<n>`
  - `https://www.amazon.pl/gp/bestsellers/<root>/<node id>` (`?pg=2` for ranks 51–100)

## Tools

```bash
A=.claude/skills/exclusion-rules/amazon
bash $A/fetch.sh <dir> <url>...                      # WebFetch gets 503 on amazon.pl
node $A/child-nodes.js <bestsellers.html>            # child category ids and names
node $A/parse-listing.js <dir> <products.tsv>        # price, reviews, bought/month, rating, title
bash $A/api.sh GET                                   # all rules as JSON
bash $A/api.sh POST /batch @<batch.json>             # every change at once
```

- Live rules to `rules.txt`: `bash $A/api.sh GET > rules.json`, then
  `node -e 'for (const r of JSON.parse(require("fs").readFileSync(0, "utf8"))) console.log((r.categoryId ? r.categoryId + "\t" : "") + r.value)' < rules.json > rules.txt`.
- `api.sh` reads `AMAZON_API_URL` from `.env`; pass bodies as `@<file>` (UTF-8 JSON in the scratchpad), never inline.
