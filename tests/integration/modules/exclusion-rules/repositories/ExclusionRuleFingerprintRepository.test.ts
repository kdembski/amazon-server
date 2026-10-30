import { describe, expect, it } from "vitest";
import { ExclusionRuleFingerprintRepository } from "@/modules/exclusion-rules/repositories/ExclusionRuleFingerprintRepository";
import { prisma } from "../../../../support/integration/db";

const repository = new ExclusionRuleFingerprintRepository(prisma);

describe("ExclusionRuleFingerprintRepository (MySQL)", () => {
  it("returns undefined before the first set", async () => {
    expect(await repository.getByMarketplace("amazon")).toBeUndefined();
  });

  it("set stores the fingerprint and replaces it on the next set", async () => {
    await repository.set(
      "amazon",
      new Map([
        ["", "false\tdrill"],
        ["1", "active"],
      ])
    );
    await repository.set("amazon", new Map([["2", "active"]]));

    expect(await repository.getByMarketplace("amazon")).toEqual(
      new Map([["2", "active"]])
    );
  });
});
