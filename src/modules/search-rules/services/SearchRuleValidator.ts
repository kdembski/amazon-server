import { SearchRuleParser } from "@/modules/search-rules/services/SearchRuleParser";

export const MAX_SEARCH_RULE_LENGTH = 63;

const invalid = (error: Error) => Object.assign(error, { status: 400 });

export class SearchRuleValidator {
  private parser;

  constructor(parser = new SearchRuleParser()) {
    this.parser = parser;
  }

  validate(value: unknown) {
    if (typeof value !== "string") {
      throw invalid(new Error("Search rule must be a string"));
    }

    const trimmed = value.trim();
    if (trimmed.length > MAX_SEARCH_RULE_LENGTH) {
      throw invalid(
        new Error(
          `Search rule "${trimmed}" is longer than ${MAX_SEARCH_RULE_LENGTH} characters`
        )
      );
    }

    try {
      this.parser.parse(trimmed);
    } catch (error: any) {
      throw invalid(error);
    }
    return trimmed;
  }

  validateScope(scope: unknown) {
    if (scope === undefined || scope === null) return scope;
    if (!Number.isInteger(scope) || (scope as number) < 1) {
      throw invalid(
        new Error(
          `Search rule scope ${JSON.stringify(scope)} must be a positive integer`
        )
      );
    }
    return scope as number;
  }
}
