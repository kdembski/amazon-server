import { describe, expect, it } from "vitest";
import {
  InvalidBreakdownKeyError,
  parseBreakdownKey,
} from "@/modules/monitoring/helpers/parseBreakdownKey";

describe("parseBreakdownKey", () => {
  it.each(["country", "flow"])("accepts %s", (key) => {
    expect(parseBreakdownKey(key)).toBe(key);
  });

  it.each([undefined, "", "scraper", ["country"]])("rejects %j with a 400 error", (value) => {
    expect(() => parseBreakdownKey(value)).toThrow(InvalidBreakdownKeyError);
    expect(new InvalidBreakdownKeyError().status).toBe(400);
  });
});
