import { describe, expect, it } from "vitest";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";

const word = (text: string) => ({ text, wordStart: true, wordEnd: true });
const parser = new ExclusionRuleParser();
const parseExclusionRule = (value: string) => parser.parse(value);

describe("ExclusionRuleParser.parse", () => {
  it("parses a single phrase", () => {
    expect(parseExclusionRule("sony")).toEqual({ include: [[word("sony")]], exclude: [] });
  });

  it("splits members on +, alternatives on | and exclusions on !", () => {
    expect(parseExclusionRule("rtx+4090|4080+!laptop|mobile")).toEqual({
      include: [[word("rtx")], [word("4090"), word("4080")]],
      exclude: [word("laptop"), word("mobile")],
    });
  });

  it("keeps inner spaces of phrases and trims the edges", () => {
    expect(parseExclusionRule(" open box + ! damaged | b stock ")).toEqual({
      include: [[word("open box")]],
      exclude: [word("damaged"), word("b stock")],
    });
  });

  it("returns a rule with exclusions only", () => {
    expect(parseExclusionRule("!used|refurbished")).toEqual({
      include: [],
      exclude: [word("used"), word("refurbished")],
    });
  });

  it("turns * at the edges of a phrase into partial word matching", () => {
    expect(parseExclusionRule("drewn*|*phone|*tor*+!* kompatyb *")).toEqual({
      include: [
        [
          { text: "drewn", wordStart: true, wordEnd: false },
          { text: "phone", wordStart: false, wordEnd: true },
          { text: "tor", wordStart: false, wordEnd: false },
        ],
      ],
      exclude: [{ text: "kompatyb", wordStart: false, wordEnd: false }],
    });
  });

  it.each(["", " ", "a++b", "a+", "+a", "!", "a+!", "a||b", "a|", "!|a", "*", "a|**", "!* "])(
    "rejects an empty fragment in %j",
    (value) => {
      expect(() => parseExclusionRule(value)).toThrow(
        `Exclusion rule "${value}" contains an empty part`
      );
    }
  );

  it.each(["a*b", "**a", "a|b**"])("rejects * inside a phrase in %j", (value) => {
    expect(() => parseExclusionRule(value)).toThrow(
      `Exclusion rule "${value}" can have * only at the start or end of a phrase`
    );
  });
});
