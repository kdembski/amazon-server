import { HttpError } from "@/shared/http/HttpError";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";

export const MAX_EXCLUSION_RULE_LENGTH = 512;

export class ExclusionRuleValidator {
  private parser;

  constructor(parser = new ExclusionRuleParser()) {
    this.parser = parser;
  }

  validate(value: unknown) {
    if (typeof value !== "string") {
      throw new HttpError(400, "Exclusion rule must be a string");
    }

    const trimmed = value.trim();
    if (trimmed.length > MAX_EXCLUSION_RULE_LENGTH) {
      throw new HttpError(400, `Exclusion rule "${trimmed}" is longer than ${MAX_EXCLUSION_RULE_LENGTH} characters`);
    }

    try {
      this.parser.parse(trimmed);
    } catch (error: any) {
      throw new HttpError(400, error.message);
    }
    return trimmed;
  }

  validateScope(scope: unknown) {
    if (scope === undefined || scope === null) return scope;
    if (!Number.isInteger(scope) || (scope as number) < 1) {
      throw new HttpError(400, `Exclusion rule scope ${JSON.stringify(scope)} must be a positive integer`);
    }
    return scope as number;
  }

  // Setting inverted in an update requires sending the scope as well.
  validateInverted(inverted: unknown, scope: number | null | undefined) {
    if (inverted === undefined) return inverted;
    if (typeof inverted !== "boolean") {
      throw new HttpError(400, `Exclusion rule inverted ${JSON.stringify(inverted)} must be a boolean`);
    }
    if (inverted && (scope === undefined || scope === null)) {
      throw new HttpError(400, "Inverted exclusion rule must have a scope");
    }
    return inverted;
  }
}
