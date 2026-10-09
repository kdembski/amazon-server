import { describe, expect, it } from "vitest";
import { calculateAvg } from "@/helpers/number";
import { PrismaClient } from "@@prisma/PrismaClient";

describe("vitest setup", () => {
  it("resolves the @ alias", () => {
    expect(calculateAvg([2, 4])).toBe(3);
  });

  it("resolves the @@prisma alias", () => {
    expect(typeof PrismaClient.getInstance).toBe("function");
  });
});
