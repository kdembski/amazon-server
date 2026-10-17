export interface ParsedSearchRule {
  include: string[][];
  exclude: string[];
}

export const parseSearchRule = (value: string): ParsedSearchRule => {
  const include: string[][] = [];
  const exclude: string[] = [];

  for (const rawMember of value.split("+")) {
    const member = rawMember.trim();
    const negated = member.startsWith("!");
    const phrases = (negated ? member.slice(1) : member)
      .split("|")
      .map((phrase) => phrase.trim());

    if (phrases.some((phrase) => !phrase)) {
      throw new Error(`Zasada **${value}** zawiera pusty fragment`);
    }

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

const italic = (phrase: string) => `*${phrase}*`;

export const describeSearchRule = (rule: ParsedSearchRule) => {
  const excluded = rule.exclude.map(italic).join(", ");

  if (isGlobalExclusion(rule)) {
    return `globalnie wyklucza: ${excluded}`;
  }

  const required = rule.include
    .map((group) => group.map(italic).join(" lub "))
    .join("; ");

  return excluded
    ? `musi zawierać: ${required}; nie może zawierać: ${excluded}`
    : `musi zawierać: ${required}`;
};

// MySQL LIKE uses backslash as the default escape character.
export const escapeLikePattern = (phrase: string) =>
  phrase.replace(/[\\%_]/g, (char) => `\\${char}`);
