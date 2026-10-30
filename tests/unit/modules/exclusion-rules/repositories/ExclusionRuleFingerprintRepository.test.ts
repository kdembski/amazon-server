import { describe, expect, it } from "vitest";
import { ExclusionRuleFingerprintRepository } from "@/modules/exclusion-rules/repositories/ExclusionRuleFingerprintRepository";
import { fakePrisma } from "../../../../support/fakes";

describe("ExclusionRuleFingerprintRepository", () => {
  it("getByMarketplace returns the stored scopes as a map", async () => {
    const db = fakePrisma();
    db.exclusionRuleFingerprint.findUnique.mockResolvedValue({
      scopes: { "": "false\tdrill", "1": "active" },
    });
    const repository = new ExclusionRuleFingerprintRepository(db.prisma);

    expect(await repository.getByMarketplace("amazon")).toEqual(
      new Map([
        ["", "false\tdrill"],
        ["1", "active"],
      ])
    );
    expect(db.exclusionRuleFingerprint.findUnique).toHaveBeenCalledWith({
      where: { marketplace: "amazon" },
      select: { scopes: true },
    });
  });

  it("getByMarketplace returns undefined without a stored row", async () => {
    const db = fakePrisma();
    db.exclusionRuleFingerprint.findUnique.mockResolvedValue(null);
    const repository = new ExclusionRuleFingerprintRepository(db.prisma);

    expect(await repository.getByMarketplace("amazon")).toBeUndefined();
  });

  it("set upserts the scopes of the marketplace", async () => {
    const db = fakePrisma();
    const repository = new ExclusionRuleFingerprintRepository(db.prisma);

    await repository.set("amazon", new Map([["1", "active"]]));

    expect(db.exclusionRuleFingerprint.upsert).toHaveBeenCalledWith({
      where: { marketplace: "amazon" },
      create: { marketplace: "amazon", scopes: { "1": "active" } },
      update: { scopes: { "1": "active" } },
    });
  });
});
