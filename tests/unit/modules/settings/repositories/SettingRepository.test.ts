import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { SettingRepository } from "@/modules/settings/repositories/SettingRepository";
import { fakePrisma } from "../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new SettingRepository(db.prisma), delegate: db.setting };
};

describe("SettingRepository", () => {
  it("reads the key and value of every setting", async () => {
    const { repository, delegate } = setup();

    await repository.getAll();

    expect(delegate.findMany).toHaveBeenCalledWith({ select: { key: true, value: true } });
  });

  it("upserts and deletes by key", async () => {
    const { repository, delegate } = setup();
    const create = { key: "priceDrop.dropPercent", value: 40 } as Prisma.SettingCreateInput;
    const update = { value: 40 } as Prisma.SettingUpdateInput;

    await repository.upsert("priceDrop.dropPercent", create, update);
    await repository.delete("priceDrop.dropPercent");

    expect(delegate.upsert).toHaveBeenCalledWith({
      where: { key: "priceDrop.dropPercent" },
      create,
      update,
    });
    expect(delegate.deleteMany).toHaveBeenCalledWith({ where: { key: "priceDrop.dropPercent" } });
  });
});
