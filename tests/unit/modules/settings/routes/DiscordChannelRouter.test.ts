import { describe, expect, it, vi } from "vitest";
import { DiscordChannelRouter } from "@/modules/settings/routes/DiscordChannelRouter";
import { DiscordChannelController } from "@/modules/settings/controllers/DiscordChannelController";
import { fakeRouter, routeTable } from "../../../../support/fakes";

describe("DiscordChannelRouter", () => {
  it("is mounted at /discord-channels and registers the CRUD routes", () => {
    const controller = { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const { router, calls } = fakeRouter();
    const channelRouter = new DiscordChannelRouter(
      controller as unknown as DiscordChannelController,
      router
    );

    expect(channelRouter.path).toBe("/discord-channels");
    expect(channelRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["post", "/"],
      ["put", "/:id"],
      ["delete", "/:id"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.getAll).toHaveBeenCalledWith("res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.create).toHaveBeenCalledWith("req", "res");
    (calls[2].handler as Function)("req", "res");
    expect(controller.update).toHaveBeenCalledWith("req", "res");
    (calls[3].handler as Function)("req", "res");
    expect(controller.delete).toHaveBeenCalledWith("req", "res");
  });
});
