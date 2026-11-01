import { describe, expect, it } from "vitest";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { prisma } from "../../../../support/integration/db";
import { FIXED_DATE } from "../../../../support/factories";

const repository = new DiscordChannelRepository(prisma);

describe("DiscordChannelRepository (MySQL)", () => {
  it("creates, updates, lists by id and deletes channels", async () => {
    const created = await repository.create({
      name: "deals",
      token: "800/deals",
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    });

    await repository.update(created.id, { name: "big-deals", updatedAt: FIXED_DATE });

    expect((await repository.getById(created.id))?.name).toBe("big-deals");
    expect((await repository.getAll()).map((channel) => channel.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, created.id]);

    await repository.delete(created.id);
    expect(await repository.getById(created.id)).toBeNull();
  });
});
