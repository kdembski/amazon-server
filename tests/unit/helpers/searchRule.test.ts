import { describe, expect, it } from "vitest";
import {
  describeSearchRule,
  escapeLikePattern,
  isGlobalExclusion,
  parseSearchRule,
} from "@/helpers/searchRule";

describe("parseSearchRule", () => {
  it("parses a single phrase", () => {
    expect(parseSearchRule("sony")).toEqual({ include: [["sony"]], exclude: [] });
  });

  it("splits members on +, alternatives on | and exclusions on !", () => {
    expect(parseSearchRule("rtx+4090|4080+!laptop|mobile")).toEqual({
      include: [["rtx"], ["4090", "4080"]],
      exclude: ["laptop", "mobile"],
    });
  });

  it("keeps inner spaces of phrases and trims the edges", () => {
    expect(parseSearchRule(" open box + ! damaged | b stock ")).toEqual({
      include: [["open box"]],
      exclude: ["damaged", "b stock"],
    });
  });

  it("returns a rule with exclusions only", () => {
    expect(parseSearchRule("!used|refurbished")).toEqual({
      include: [],
      exclude: ["used", "refurbished"],
    });
  });

  it.each(["", " ", "a++b", "a+", "+a", "!", "a+!", "a||b", "a|", "!|a"])(
    "rejects an empty fragment in %j",
    (value) => {
      expect(() => parseSearchRule(value)).toThrow(
        `Zasada **${value}** zawiera pusty fragment`
      );
    }
  );
});

describe("isGlobalExclusion", () => {
  it("is true only for rules without a positive member", () => {
    expect(isGlobalExclusion(parseSearchRule("!used"))).toBe(true);
    expect(isGlobalExclusion(parseSearchRule("sony+!used"))).toBe(false);
  });
});

describe("describeSearchRule", () => {
  it("describes required phrases with alternatives", () => {
    expect(describeSearchRule(parseSearchRule("rtx+4090|4080"))).toBe(
      "musi zawierać: *rtx*; *4090* lub *4080*"
    );
  });

  it("appends exclusions of a rule", () => {
    expect(describeSearchRule(parseSearchRule("rtx+!laptop|mobile"))).toBe(
      "musi zawierać: *rtx*; nie może zawierać: *laptop*, *mobile*"
    );
  });

  it("describes a global exclusion", () => {
    expect(describeSearchRule(parseSearchRule("!used|b-stock"))).toBe(
      "globalnie wyklucza: *used*, *b-stock*"
    );
  });
});

describe("escapeLikePattern", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLikePattern("50%_off\\x")).toBe("50\\%\\_off\\\\x");
  });

  it("leaves plain text untouched", () => {
    expect(escapeLikePattern("WH-1000XM5")).toBe("WH-1000XM5");
  });
});
