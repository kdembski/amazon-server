import { describe, expect, it } from "vitest";
import { isDatabaseUnavailable } from "@/shared/http/isDatabaseUnavailable";

describe("isDatabaseUnavailable", () => {
  it.each([{ code: "P1001" }, { code: "P2024" }, { errorCode: "P1017" }])("is true for %j", (error) => {
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it.each([{ code: "P2002" }, new Error("x"), undefined, null, "P1001"])("is false for %j", (error) => {
    expect(isDatabaseUnavailable(error)).toBe(false);
  });
});
