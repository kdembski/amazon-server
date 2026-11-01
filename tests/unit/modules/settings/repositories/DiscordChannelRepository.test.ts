import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { fakePrisma } from "../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new DiscordChannelRepository(db.prisma), delegate: db.discordChannel };
};

describe("DiscordChannelRepository", () => {
  it("reads by id and all ordered by id", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getAll();

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(delegate.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  it("creates, updates and deletes", async () => {
    const { repository, delegate } = setup();
    const data = { name: "outlier-90", token: "1/a" } as Prisma.DiscordChannelCreateInput;

    await repository.create(data);
    await repository.update(2, { name: "x" });
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { name: "x" } });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
