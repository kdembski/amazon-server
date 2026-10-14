import { describe, expect, it } from "vitest";
import { BlacklistedKeywordRepository } from "@/repositories/blacklist/BlacklistedKeywordRepository";
import { prisma } from "../../../support/integration/db";
import { seedKeyword } from "../../../support/integration/seed";

const repository = new BlacklistedKeywordRepository(prisma);

describe("BlacklistedKeywordRepository (MySQL)", () => {
  it("getByValue finds by the unique value and the value cannot repeat", async () => {
    const keyword = await seedKeyword({ value: "used" });

    expect((await repository.getByValue("used"))?.id).toBe(keyword.id);
    expect(await repository.getByValue("new")).toBeNull();
    await expect(seedKeyword({ value: "used" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("getAll lists everything and delete removes one", async () => {
    const a = await seedKeyword();
    const b = await seedKeyword();

    await repository.delete(a.id);

    expect((await repository.getAll()).map((k) => k.id)).toEqual([b.id]);
  });
});
