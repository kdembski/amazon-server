// Usage:
//   npx vite-node check-rules.js check <rules.txt> [options] [products.tsv ...]
//   npx vite-node check-rules.js which <rules.txt> [--category id] "<ad name>"
// Options:
//   --junk <file> / --keep <file>  ad names (one per line) that must be excluded / must pass
//   --min-rating <stars>           quality floor for the star rating, default 4
//   --min-reviews <n>              demand floor for review count, default 100
//   --min-bought <n>               demand floor for "bought last month", default 50
//   --kept <n>                     print the n cheapest passing products that are not in demand
//   --category <id>                also use the rules of this category; without it only rules with no category
// A rules.txt line is "<value>", "<categoryId>\t<value>" or "<categoryId>\tinverted\t<value>"; with inverted rules
// the category keeps only names matching one of them.
// products.tsv comes from parse-listing.js. A product is in demand when its rating reaches the quality floor
// and its reviews or monthly purchases reach theirs.
// Imports the production parser and matcher through vite-node (it resolves the `@/` alias), so results equal
// what ExclusionRuleMatchCronService computes.
import fs from "node:fs";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ExclusionRuleMatcher";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";

const parser = new ExclusionRuleParser();
const NO_INVERTED_MATCH = "(no inverted rule matched)";
const createExcludes = (rules) => {
  const matcher = new ExclusionRuleMatcher(rules);
  return (name) => matcher.excludes(name);
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
const keptCount = Number(option("--kept") ?? 0);
const productFiles = args;

const rules = lines(rulesFile)
  .map((line) => {
    const scoped = line.match(/^(\d+)\t(inverted\t)?(.*)$/);
    return scoped
      ? { category: scoped[1], inverted: !!scoped[2], value: scoped[3].trim() }
      : { category: null, inverted: false, value: line };
  })
  .filter((rule) => rule.category === null || rule.category === category);
const values = rules.map((rule) => rule.value);
const parsed = values.map((value) => {
  try {
    return parser.parse(value);
  } catch (e) {
    console.log(`PARSE ERROR  ${e.message}`);
    process.exitCode = 1;
    return null;
  }
});
const scopedMatcher = new ScopedExclusionRuleMatcher(
  rules.flatMap((rule, i) =>
    parsed[i] ? [{ rule: parsed[i], scope: rule.category, inverted: rule.inverted }] : []
  )
);
const excludesAll = (name) => scopedMatcher.excludes(name, category);
const ruleMatches = parsed.map((rule) => (rule ? createExcludes([rule]) : () => false));
const ruleExcludes = ruleMatches.map((matches, i) => (rules[i].inverted ? () => false : matches));
const invertedIndexes = rules.flatMap((rule, i) => (rule.inverted ? [i] : []));
const missesInverted = (name) =>
  invertedIndexes.length > 0 && !invertedIndexes.some((i) => ruleMatches[i](name));
const excludedBy = (name) => [
  ...values.filter((_, i) => ruleExcludes[i](name)),
  ...(missesInverted(name) ? [NO_INVERTED_MATCH] : []),
];
const scopeOf = (i) =>
  rules[i].category ? `  (category ${rules[i].category}${rules[i].inverted ? ", inverted" : ""})` : "";

if (mode === "which") {
  const name = productFiles.join(" ");
  values.forEach((value, i) => {
    if (ruleExcludes[i](name)) console.log(`EXCLUDED BY ${value}${scopeOf(i)}`);
    if (rules[i].inverted && ruleMatches[i](name)) console.log(`MATCHED BY ${value}${scopeOf(i)}`);
  });
  if (missesInverted(name)) console.log(`EXCLUDED BY ${NO_INVERTED_MATCH}`);
  console.log(excludesAll(name) ? "=> excluded (excluded = true)" : "=> scraped (excluded = false)");
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

  const junk = junkNames.filter((t) => !excludesAll(t));
  const lost = keepNames.filter(excludesAll);
  junk.forEach((t) => console.log(`JUNK KEPT  ${t}`));
  lost.forEach((t) => console.log(`KEEP EXCLUDED  ${t}  BY ${excludedBy(t).join(" ; ")}`));
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
    const isInDemand = (p) =>
      p.rating >= minRating && (p.reviews >= minReviews || p.bought >= minBought);
    const inDemand = products.filter(isInDemand);
    const passed = inDemand.filter((p) => !excludesAll(p.title));
    const cheapKept = products.filter((p) => p.price && p.price < CHEAP && !excludesAll(p.title));
    console.log(
      `\nCOVERAGE  ${passed.length}/${inDemand.length} in-demand products ` +
        `(rating >= ${minRating} and >= ${minReviews} reviews or >= ${minBought} bought/month), ` +
        `${cheapKept.length} kept products < ${CHEAP} zł`
    );

    values.forEach((value, i) => {
      const dropped = inDemand.filter((p) => ruleExcludes[i](p.title));
      if (dropped.length) {
        console.log(`\n${dropped.length} in-demand products excluded by  ${value}${scopeOf(i)}`);
        dropped.slice(0, 4).forEach((p) => console.log(`    ${p.price}  ${p.title.slice(0, 90)}`));
      }
    });
    const missed = inDemand.filter((p) => missesInverted(p.title));
    if (missed.length) {
      console.log(`\n${missed.length} in-demand products excluded by  ${NO_INVERTED_MATCH}`);
      missed.slice(0, 4).forEach((p) => console.log(`    ${p.price}  ${p.title.slice(0, 90)}`));
    }

    if (keptCount) {
      console.log(`\nKEPT (price | rating | reviews | bought/month | title)`);
      products
        .filter((p) => !isInDemand(p) && !excludesAll(p.title))
        .sort((a, b) => a.price - b.price)
        .slice(0, keptCount)
        .forEach((p) =>
          console.log(`    ${p.price} | ${p.rating} | ${p.reviews} | ${p.bought} | ${p.title.slice(0, 90)}`)
        );
    }
  }

  console.log(`\n${values.length} rules, ${junk.length} junk kept, ${lost.length} keep excluded`);
}
