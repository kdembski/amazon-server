import { describe, expect, it } from "vitest";
import { prisma, truncateAll } from "../support/integration/db";
import { seedCategory } from "../support/integration/seed";

describe("integration smoke", () => {
  it("talks to the MySQL database", async () => {
    const rows = await prisma.$queryRaw<{ one: number | bigint }[]>`SELECT 1 AS one`;

    expect(Number(rows[0].one)).toBe(1);
  });

  it("seeds and truncates", async () => {
    await seedCategory();
    expect(await prisma.amazonAdCategory.count()).toBe(1);

    await truncateAll();

    expect(await prisma.amazonAdCategory.count()).toBe(0);
  });

  it("starts with empty tables thanks to the setup hook", async () => {
    expect(await prisma.amazonAdCategory.count()).toBe(0);
  });
});
