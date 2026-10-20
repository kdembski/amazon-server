import {
  ParsedExclusionRule,
  SearchPhrase,
} from "@/modules/exclusion-rules/interfaces/ParsedExclusionRule";

const WILDCARD = "*";

export class ExclusionRuleParser {
  parse(value: string): ParsedExclusionRule {
    const include: SearchPhrase[][] = [];
    const exclude: SearchPhrase[] = [];

    for (const rawMember of value.split("+")) {
      const member = rawMember.trim();
      const negated = member.startsWith("!");
      const phrases = (negated ? member.slice(1) : member)
        .split("|")
        .map((phrase) => this.parsePhrase(value, phrase));

      if (negated) {
        exclude.push(...phrases);
      } else {
        include.push(phrases);
      }
    }

    if (!include.length) {
      throw new Error(
        `Exclusion rule "${value}" needs at least one phrase without !`
      );
    }

    return { include, exclude };
  }

  private parsePhrase(value: string, rawPhrase: string): SearchPhrase {
    let text = rawPhrase.trim();
    const wordStart = !text.startsWith(WILDCARD);
    if (!wordStart) text = text.slice(1);
    const wordEnd = !text.endsWith(WILDCARD);
    if (!wordEnd) text = text.slice(0, -1);
    text = text.trim();

    if (!text) {
      throw new Error(`Exclusion rule "${value}" contains an empty part`);
    }

    if (text.includes(WILDCARD)) {
      throw new Error(
        `Exclusion rule "${value}" can have * only at the start or end of a phrase`
      );
    }

    return { text, wordStart, wordEnd };
  }
}
