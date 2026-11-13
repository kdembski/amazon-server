// Usage:
//   npx vite-node check-rules.js check <rules.txt> [--category id] [--junk file] [--keep file]
//   npx vite-node check-rules.js which <rules.txt> [--category id] "<ad name>"
// --junk / --keep: ad names (one per line) that must be excluded / must pass.
// --category: also use the rules of this category; without it only rules with no category.
// A rules.txt line is "<value>", "<categoryId>\t<value>" or "<categoryId>\tinverted\t<value>"; with inverted rules
// the category keeps only names matching one of them.
// Imports the production parser and matcher through vite-node (it resolves the `@/` alias), so results equal
// what ExclusionRuleMatchCronService computes.
import fs from "node:fs";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ExclusionRuleMatcher";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";

const parser = new ExclusionRuleParser();
const NO_INVERTED_MATCH = "(no inverted rule matched)";
const MAX_RULE_LENGTH = 512;

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
const category = option("--category") ?? null;

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
const ruleMatches = parsed.map((rule) => {
  if (!rule) return () => false;
  const matcher = new ExclusionRuleMatcher([rule]);
  return (name) => matcher.excludes(name);
});
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
  const name = args.join(" ");
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

  console.log(`\n${values.length} rules, ${junk.length} junk kept, ${lost.length} keep excluded`);
}
