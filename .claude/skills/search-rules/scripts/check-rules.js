// Usage:
//   npx vite-node check-rules.js check <rules.txt> [options] [products.tsv ...]
//   npx vite-node check-rules.js which <rules.txt> "<ad name>"
// Options:
//   --junk <file> / --keep <file>  ad names (one per line) that must not / must match
//   --min-rating <stars>           quality floor for the star rating, default 4
//   --min-reviews <n>              demand floor for review count, default 100
//   --min-bought <n>               demand floor for "bought last month", default 50
//   --missed <n>                   print the n unmatched in-demand products with the most demand
//   --category <id>                also use the rules of this category; without it only rules with no category
// A rules.txt line is "<value>" or "<categoryId>\t<value>".
// products.tsv comes from parse-listing.js. A product is in demand when its rating reaches the quality floor
// and its reviews or monthly purchases reach theirs.
// Imports the production parser and matcher through vite-node (it resolves the `@/` alias), so results equal
// what SearchRuleMatchCronService computes.
import fs from "node:fs";
import { isGlobalExclusion } from "@/modules/search-rules/helpers/searchRule";
import { SearchRuleParser } from "@/modules/search-rules/services/SearchRuleParser";
import { SearchRuleMatcher } from "@/modules/search-rules/services/SearchRuleMatcher";

const parser = new SearchRuleParser();
const parseSearchRule = (value) => parser.parse(value);
const createSearchRuleMatcher = (rules) => {
  const matcher = new SearchRuleMatcher(rules);
  return (name) => matcher.matches(name);
};

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
const minRating = Number(option("--min-rating") ?? 4);
const minReviews = Number(option("--min-reviews") ?? 100);
const minBought = Number(option("--min-bought") ?? 50);
const category = option("--category") ?? null;
const missedCount = Number(option("--missed") ?? 0);
const productFiles = args;

const rules = lines(rulesFile)
  .map((line) => {
    const scoped = line.match(/^(\d+)\t(.*)$/);
    return scoped
      ? { category: scoped[1], value: scoped[2].trim() }
      : { category: null, value: line };
  })
  .filter((rule) => rule.category === null || rule.category === category);
const values = rules.map((rule) => rule.value);
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
      const scope = rules[i].category ? `  (category ${rules[i].category})` : "";
      console.log(`${blocked ? "BLOCKED BY GLOBAL " : "MATCH "} ${value}${scope}`);
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
      const [, price, reviews, bought, rating, title] = line.split("\t");
      return {
        price: Number(price) || 0,
        reviews: Number(reviews) || 0,
        bought: Number(bought) || 0,
        rating: Number(rating) || 0,
        title: title ?? "",
      };
    })
    .filter((p) => p.title && !seen.has(p.title) && seen.add(p.title));

  if (products.length) {
    const inDemand = products.filter(
      (p) => p.rating >= minRating && (p.reviews >= minReviews || p.bought >= minBought)
    );
    const covered = inDemand.filter((p) => matchesAll(p.title));
    const cheap = products.filter((p) => p.price && p.price < CHEAP && matchesAll(p.title));
    console.log(
      `\nCOVERAGE  ${covered.length}/${inDemand.length} in-demand products ` +
        `(rating >= ${minRating} and >= ${minReviews} reviews or >= ${minBought} bought/month), ` +
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
      console.log(`\nMISSED (price | rating | reviews | bought/month | title)`);
      inDemand
        .filter((p) => !matchesAll(p.title))
        .sort((a, b) => b.bought - a.bought || b.reviews - a.reviews)
        .slice(0, missedCount)
        .forEach((p) =>
          console.log(`    ${p.price} | ${p.rating} | ${p.reviews} | ${p.bought} | ${p.title.slice(0, 90)}`)
        );
    }
  }

  console.log(`\n${values.length} rules, ${junk.length} junk matched, ${lost.length} keep missed`);
}
