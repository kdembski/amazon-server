# Exclusion rules: Amazon

- Tables: `AmazonExclusionRule`; `AmazonAd` (`name`, `excluded`, `categoryId`; `name` has no index);
  `AmazonAdCategory` (`active`).
- API: `/amazon/exclusion-rules` (`GET`, `POST /batch`); `api.sh` reads `API_URL`, `API_TOKEN` from `.env`.

```bash
A=.claude/skills/exclusion-rules/amazon
bash $A/api.sh GET > rules.json               # live rules with ids
bash $A/api.sh POST /batch @batch.json        # body as a scratchpad file, never inline
```

- `rules.json` to `rules.txt`:
  `node -e 'for (const r of JSON.parse(require("fs").readFileSync(0, "utf8"))) console.log((r.categoryId ? r.categoryId + "\t" : "") + (r.inverted ? "inverted\t" : "") + r.value)' < rules.json > rules.txt`
- Batch body: `{"create": [{"value", "categoryId", "inverted"?}], "update": [{"id", "value"?, "categoryId"?}],
  "delete": [id]}`; one transaction, any error rolls back (400 invalid rule, 422 duplicate or unknown category).
- Sample passing ads (database skill), several id offsets:
  `SELECT name FROM AmazonAd WHERE categoryId = ? AND excluded = false AND id > ? ORDER BY id LIMIT 200`.
