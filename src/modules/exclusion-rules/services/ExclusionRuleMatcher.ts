import {
  ParsedExclusionRule,
  SearchPhrase,
} from "@/modules/exclusion-rules/interfaces/ParsedExclusionRule";
import { normalizeSearchText } from "@/modules/exclusion-rules/helpers/exclusionRule";

type Test = (name: string) => boolean;

const WORD_BEFORE = "(?<![\\p{L}\\p{N}])";
const WORD_AFTER = "(?![\\p{L}\\p{N}])";

export class ExclusionRuleMatcher {
  private rules: Test[];

  constructor(rules: ParsedExclusionRule[]) {
    this.rules = rules.map((rule) => {
      const groups = rule.include.map((phrases) => this.anyOf(phrases));
      const exception = this.anyOf(rule.exclude);
      return (name: string) =>
        groups.every((group) => group(name)) && !exception(name);
    });
  }

  excludes(name: string) {
    const normalized = normalizeSearchText(name);
    return this.rules.some((rule) => rule(normalized));
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
