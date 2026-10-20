import {
  ParsedExclusionRule,
  SearchPhrase,
} from "@/modules/exclusion-rules/interfaces/ParsedExclusionRule";
import {
  isGlobalExclusion,
  normalizeSearchText,
} from "@/modules/exclusion-rules/helpers/exclusionRule";

type Test = (name: string) => boolean;

const WORD_BEFORE = "(?<![\\p{L}\\p{N}])";
const WORD_AFTER = "(?![\\p{L}\\p{N}])";

export class ExclusionRuleMatcher {
  private positive: Test[];
  private globallyExcluded: Test;

  constructor(rules: ParsedExclusionRule[]) {
    this.positive = rules
      .filter((rule) => !isGlobalExclusion(rule))
      .map((rule) => {
        const groups = rule.include.map((phrases) => this.anyOf(phrases));
        const excluded = this.anyOf(rule.exclude);
        return (name: string) =>
          groups.every((group) => group(name)) && !excluded(name);
      });
    this.globallyExcluded = this.anyOf(
      rules.filter(isGlobalExclusion).flatMap((rule) => rule.exclude)
    );
  }

  matches(name: string) {
    const normalized = normalizeSearchText(name);
    return (
      this.positive.some((rule) => rule(normalized)) &&
      !this.globallyExcluded(normalized)
    );
  }

  private anyOf(phrases: SearchPhrase[]): Test {
    const tests = phrases.map((phrase) => this.compile(phrase));
    return (name) => tests.some((test) => test(name));
  }

  private compile(phrase: SearchPhrase): Test {
    const pattern = new RegExp(
      `${phrase.wordStart ? WORD_BEFORE : ""}${normalizeSearchText(
        phrase.text
      ).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}${
        phrase.wordEnd ? WORD_AFTER : ""
      }`,
      "u"
    );
    return (name) => pattern.test(name);
  }
}
