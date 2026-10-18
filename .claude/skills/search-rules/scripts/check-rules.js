// Usage:
//   node check-rules.js check <rules.txt> [options] [products.tsv ...]
//   node check-rules.js which <rules.txt> "<ad name>"
// Options:
//   --junk <file> / --keep <file>  ad names (one per line) that must not / must match
//   --min-price <zł>               demand floor for price, default 60
//   --min-reviews <n>              demand floor for review count, default 100
//   --min-bought <n>               demand floor for "bought last month", default 50
//   --missed <n>                   print the n unmatched in-demand products with the most demand
// products.tsv comes from parse-listing.js. A product is in demand when its price reaches the price floor
// and its reviews or monthly purchases reach theirs.
// Imports the production matcher (Node strips its types), so results equal what
// SearchRuleMatchCronService computes.
import fs from "node:fs";
import {
  createSearchRuleMatcher,
  isGlobalExclusion,
  parseSearchRule,
} from "../../../../src/helpers/searchRule.ts";

const MAX_RULE_LENGTH = 63;
const CHEAP = 40;

const lines = (file) =>
  fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);

const [mode, rulesFile, ...args] = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args.splice(index, 2)[1];
};
const listOption = (flag) => {
  const file = option(flag);
  return file ? lines(file) : [];
};
const junkNames = listOption("--junk");
const keepNames = listOption("--keep");
const minPrice = Number(option("--min-price") ?? 60);
const minReviews = Number(option("--min-reviews") ?? 100);
const minBought = Number(option("--min-bought") ?? 50);
const missedCount = Number(option("--missed") ?? 0);
const productFiles = args;

const values = lines(rulesFile);
const parsed = values.map((value) => {
  try {
    return parseSearchRule(value);
  } catch (e) {
    console.log(`PARSE ERROR  ${e.message}`);
    process.exitCode = 1;
    return null;
  }
});
const valid = parsed.filter((rule) => rule !== null);
const globals = valid.filter(isGlobalExclusion);
const matchesAll = createSearchRuleMatcher(valid);
const matchesRule = (index) => createSearchRuleMatcher([parsed[index], ...globals]);

if (mode === "which") {
  const name = productFiles.join(" ");
  values.forEach((value, i) => {
    if (!parsed[i] || isGlobalExclusion(parsed[i])) return;
    if (createSearchRuleMatcher([parsed[i]])(name)) {
      const blocked = !matchesRule(i)(name);
      console.log(`${blocked ? "BLOCKED BY GLOBAL " : "MATCH "} ${value}`);
    }
  });
  console.log(matchesAll(name) ? "=> flagged (matchesRules = true)" : "=> not flagged");
} else {
  for (const value of values) {
    if (value.length > MAX_RULE_LENGTH) {
      console.log(`TOO LONG (${value.length})  ${value}`);
      process.exitCode = 1;
    }
  }
  for (const value of new Set(values.filter((v, i) => values.indexOf(v) !== i))) {
    console.log(`DUPLICATE  ${value}`);
    process.exitCode = 1;
  }

  const junk = junkNames.filter(matchesAll);
  const lost = keepNames.filter((t) => !matchesAll(t));
  junk.forEach((t) => console.log(`JUNK MATCHED  ${t}`));
  lost.forEach((t) => console.log(`KEEP MISSED   ${t}`));
  if (junk.length || lost.length) process.exitCode = 1;

  const seen = new Set();
  const products = productFiles
    .flatMap(lines)
    .map((line) => {
      const [, price, reviews, bought, title] = line.split("\t");
      return {
        price: Number(price) || 0,
        reviews: Number(reviews) || 0,
        bought: Number(bought) || 0,
        title: title ?? "",
      };
    })
    .filter((p) => p.title && !seen.has(p.title) && seen.add(p.title));

  if (products.length) {
    const inDemand = products.filter(
      (p) => p.price >= minPrice && (p.reviews >= minReviews || p.bought >= minBought)
    );
    const covered = inDemand.filter((p) => matchesAll(p.title));
    const cheap = products.filter((p) => p.price && p.price < CHEAP && matchesAll(p.title));
    console.log(
      `\nCOVERAGE  ${covered.length}/${inDemand.length} in-demand products ` +
        `(>= ${minPrice} zł and >= ${minReviews} reviews or >= ${minBought} bought/month), ` +
        `${cheap.length} matched products < ${CHEAP} zł`
    );

    values.forEach((value, i) => {
      if (!parsed[i] || isGlobalExclusion(parsed[i])) return;
      const hits = products.filter((p) => matchesRule(i)(p.title));
      const cheapHits = hits.filter((p) => p.price && p.price < CHEAP);
      if (cheapHits.length >= 3) {
        console.log(`\n${hits.length} hits, ${cheapHits.length} cheap  ${value}`);
        cheapHits.slice(0, 4).forEach((p) => console.log(`    ${p.price}  ${p.title.slice(0, 90)}`));
      }
    });

    if (missedCount) {
      console.log(`\nMISSED (price | reviews | bought/month | title)`);
      inDemand
        .filter((p) => !matchesAll(p.title))
        .sort((a, b) => b.bought - a.bought || b.reviews - a.reviews)
        .slice(0, missedCount)
        .forEach((p) =>
          console.log(`    ${p.price} | ${p.reviews} | ${p.bought} | ${p.title.slice(0, 90)}`)
        );
    }
  }

  console.log(`\n${values.length} rules, ${junk.length} junk matched, ${lost.length} keep missed`);
}
