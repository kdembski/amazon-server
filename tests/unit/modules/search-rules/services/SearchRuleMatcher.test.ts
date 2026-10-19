import { describe, expect, it } from "vitest";
import { SearchRuleParser } from "@/modules/search-rules/services/SearchRuleParser";
import { SearchRuleMatcher } from "@/modules/search-rules/services/SearchRuleMatcher";

const parser = new SearchRuleParser();
const matcher = (...values: string[]) => {
  const instance = new SearchRuleMatcher(values.map((value) => parser.parse(value)));
  return (name: string) => instance.matches(name);
};

describe("SearchRuleMatcher.matches", () => {
  it("matches whole words only by default", () => {
    const matches = matcher("hape", "tor");

    expect(matches("Hape drewniane pianino")).toBe(true);
    expect(matches("Tor wyścigowy")).toBe(true);
    expect(matches("Mini Gift Bag Shaped Balloon, torebka")).toBe(false);
    expect(matches("Kolektor, motor")).toBe(false);
  });

  it("matches the start, the end or any part of a word with *", () => {
    expect(matcher("drewn*")("Kuchnia drewniana")).toBe(true);
    expect(matcher("drewn*")("Nadrewniana")).toBe(false);
    expect(matcher("*phone")("Smartphone Pro")).toBe(true);
    expect(matcher("*phone")("Phones")).toBe(false);
    expect(matcher("*tor*")("Motorówka")).toBe(true);
  });

  it("matches multi-word phrases and phrases with punctuation as a whole", () => {
    const matches = matcher("gra planszowa", "L.O.L.", "ZV-E");

    expect(matches("Rodzinna gra planszowa dla dzieci")).toBe(true);
    expect(matches("Gra planszowa2")).toBe(false);
    expect(matches("L.O.L. Surprise OMG")).toBe(true);
    expect(matches("Sony ZV-E10")).toBe(false);
    expect(matches("Sony ZV-E (body)")).toBe(true);
  });

  it("treats separators and regex characters in phrases literally", () => {
    const matches = matcher("50%", "cable_usb", "GO!!!", "(x)");

    expect(matches("Save 50% today")).toBe(true);
    expect(matches("Save 50 today")).toBe(false);
    expect(matches("cable_usb")).toBe(true);
    expect(matches("cable-usb")).toBe(false);
    expect(matches("Carrera GO!!! tor")).toBe(true);
    expect(matches("Model (x) 2")).toBe(true);
    expect(matches("Model x")).toBe(false);
  });

  it("ignores letter case and Polish diacritics on both sides", () => {
    expect(matcher("Łódź")("ZDALNIE STEROWANA LODZ")).toBe(true);
    expect(matcher("lodz")("Zdalnie sterowana łódź")).toBe(true);
    expect(matcher("SONY")("sony alpha")).toBe(true);
  });

  it("requires every + member, any | alternative and no ! exclusion", () => {
    const matches = matcher("rtx+4090|4080+!laptop");

    expect(matches("RTX 4090 Founders Edition")).toBe(true);
    expect(matches("RTX 4080 Super")).toBe(true);
    expect(matches("RTX 4090 Laptop GPU")).toBe(false);
    expect(matches("RTX 4070")).toBe(false);
  });

  it("applies exclusion-only rules to every other rule", () => {
    const matches = matcher("sony", "bose", "!refurbished|used");

    expect(matches("Sony WH-1000XM5")).toBe(true);
    expect(matches("Sony WH-1000XM5 (Refurbished)")).toBe(false);
    expect(matches("Used Bose QC45")).toBe(false);
  });

  it("matches nothing without a positive rule", () => {
    expect(matcher("!used")("Sony WH-1000XM5")).toBe(false);
    expect(matcher()("Sony WH-1000XM5")).toBe(false);
  });
});
