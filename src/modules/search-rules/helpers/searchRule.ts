export interface SearchPhrase {
  text: string;
  wordStart: boolean;
  wordEnd: boolean;
}

export interface ParsedSearchRule {
  include: SearchPhrase[][];
  exclude: SearchPhrase[];
}

const WILDCARD = "*";

const parsePhrase = (value: string, rawPhrase: string): SearchPhrase => {
  let text = rawPhrase.trim();
  const wordStart = !text.startsWith(WILDCARD);
  if (!wordStart) text = text.slice(1);
  const wordEnd = !text.endsWith(WILDCARD);
  if (!wordEnd) text = text.slice(0, -1);
  text = text.trim();

  if (!text) {
    throw new Error(`Search rule "${value}" contains an empty part`);
  }

  if (text.includes(WILDCARD)) {
    throw new Error(
      `Search rule "${value}" can have * only at the start or end of a phrase`
    );
  }

  return { text, wordStart, wordEnd };
};

export const parseSearchRule = (value: string): ParsedSearchRule => {
  const include: SearchPhrase[][] = [];
  const exclude: SearchPhrase[] = [];

  for (const rawMember of value.split("+")) {
    const member = rawMember.trim();
    const negated = member.startsWith("!");
    const phrases = (negated ? member.slice(1) : member)
      .split("|")
      .map((phrase) => parsePhrase(value, phrase));

    if (negated) {
      exclude.push(...phrases);
    } else {
      include.push(phrases);
    }
  }

  return { include, exclude };
};

export const isGlobalExclusion = (rule: ParsedSearchRule) =>
  !rule.include.length;

// NFD leaves ł as a base letter, so it is mapped by hand.
const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("ł", "l");

const WORD_BEFORE = "(?<![\\p{L}\\p{N}])";
const WORD_AFTER = "(?![\\p{L}\\p{N}])";

const compilePhrase = (phrase: SearchPhrase) => {
  const pattern = new RegExp(
    `${phrase.wordStart ? WORD_BEFORE : ""}${normalize(phrase.text).replace(
      /[.*+?^${}()|[\]\\/]/g,
      "\\$&"
    )}${phrase.wordEnd ? WORD_AFTER : ""}`,
    "u"
  );
  return (name: string) => pattern.test(name);
};

export const createSearchRuleMatcher = (rules: ParsedSearchRule[]) => {
  const anyOf = (phrases: SearchPhrase[]) => {
    const tests = phrases.map(compilePhrase);
    return (name: string) => tests.some((test) => test(name));
  };

  const positive = rules
    .filter((rule) => !isGlobalExclusion(rule))
    .map((rule) => {
      const groups = rule.include.map(anyOf);
      const excluded = anyOf(rule.exclude);
      return (name: string) =>
        groups.every((group) => group(name)) && !excluded(name);
    });

  const globallyExcluded = anyOf(
    rules.filter(isGlobalExclusion).flatMap((rule) => rule.exclude)
  );

  return (name: string) => {
    const normalized = normalize(name);
    return (
      positive.some((rule) => rule(normalized)) && !globallyExcluded(normalized)
    );
  };
};

export interface ScopedSearchRule {
  rule: ParsedSearchRule;
  scope: number | null;
}

export const createScopedSearchRuleMatcher = (rules: ScopedSearchRule[]) => {
  const matchers = new Map<number | null, (name: string) => boolean>();

  return (name: string, scope: number | null) => {
    let matches = matchers.get(scope);
    if (!matches) {
      matches = createSearchRuleMatcher(
        rules
          .filter((rule) => rule.scope === null || rule.scope === scope)
          .map((rule) => rule.rule)
      );
      matchers.set(scope, matches);
    }
    return matches(name);
  };
};

export const MAX_SEARCH_RULE_LENGTH = 63;

const invalid = (error: Error) => Object.assign(error, { status: 400 });

export const validateSearchRule = (value: unknown) => {
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
    parseSearchRule(trimmed);
  } catch (error: any) {
    throw invalid(error);
  }
  return trimmed;
};
