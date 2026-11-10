import { describe, expect, it } from "vitest";
import { AmazonCountryRouteValidator } from "@/modules/marketplaces/amazon/services/AmazonCountryRouteValidator";

const validator = new AmazonCountryRouteValidator();
const rejects = (fn: () => unknown) => expect(fn).toThrow(expect.objectContaining({ status: 400 }));

describe("AmazonCountryRouteValidator", () => {
  it("returns valid values", () => {
    expect(validator.validateCountryId(3)).toBe(3);
    expect(validator.validatePriority(-1)).toBe(-1);
    expect(validator.validateProxyType("mixed1/2")).toBe("mixed1/2");
    expect(validator.validatePdpSource("twister")).toBe("twister");
    expect(validator.validateMaxAttempts(2)).toBe(2);
    expect(validator.validateMaxAttempts(20)).toBe(20);
  });

  it.each([[0], [1.5], ["3"], [undefined]])("rejects countryId %j", (value) => {
    rejects(() => validator.validateCountryId(value));
  });

  it.each([[1.5], ["3"], [null]])("rejects priority %j", (value) => {
    rejects(() => validator.validatePriority(value));
  });

  it.each([[""], [5], ["x".repeat(16)]])("rejects proxyType %j", (value) => {
    rejects(() => validator.validateProxyType(value));
  });

  it.each([["twister,awd"], ["dp"], [undefined]])("rejects pdpSource %j", (value) => {
    rejects(() => validator.validatePdpSource(value));
  });

  it.each([[1], [21], [2.5], ["6"]])("rejects maxAttempts %j", (value) => {
    rejects(() => validator.validateMaxAttempts(value));
  });
});
