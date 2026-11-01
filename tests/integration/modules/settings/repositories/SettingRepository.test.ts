import { describe, expect, it } from "vitest";
import { SettingRepository } from "@/modules/settings/repositories/SettingRepository";
import { SettingUpsertMapper } from "@/modules/settings/mappers/SettingUpsertMapper";
import { prisma } from "../../../../support/integration/db";

const repository = new SettingRepository(prisma);
const mapper = new SettingUpsertMapper();
const upsert = (key: string, value: unknown) => {
  return repository.upsert(key, mapper.toCreateInput(key, value), mapper.toUpdateInput(value));
};

describe("SettingRepository (MySQL)", () => {
  it("stores JSON values by key, replaces them and deletes them", async () => {
    const groups = [[{ channelId: 1, belowMedianPercent: 50, maxPln: 50 }]];

    await upsert("countryOutlier.ruleGroups", groups);
    await upsert("priceDrop.dropPercent", 40);
    await upsert("priceDrop.dropPercent", 35);

    expect(await repository.getAll()).toEqual(
      expect.arrayContaining([
        { key: "countryOutlier.ruleGroups", value: groups },
        { key: "priceDrop.dropPercent", value: 35 },
      ])
    );

    await repository.delete("priceDrop.dropPercent");
    await repository.delete("priceDrop.dropPercent");
    expect(await repository.getAll()).toEqual([{ key: "countryOutlier.ruleGroups", value: groups }]);
  });
});
