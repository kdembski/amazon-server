import { describe, expect, it } from "vitest";
import { isDatabaseUnavailable } from "@/shared/http/isDatabaseUnavailable";

describe("isDatabaseUnavailable", () => {
  it.each([
    { code: "P1001" },
    { code: "P2024" },
    { errorCode: "P1017" },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: 45028 } } } },
  ])("is true for %j", (error) => {
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it.each([
    { code: "P2002" },
    { code: "P2039", meta: { driverAdapterError: { cause: { code: 1264 } } } },
    new Error("x"),
    undefined,
    null,
    "P1001",
  ])("is false for %j", (error) => {
    expect(isDatabaseUnavailable(error)).toBe(false);
  });
});
