import { describe, expect, it, vi } from "vitest";
import { DiscordCategoriesCommandBuilder } from "@/builders/discord/DiscordCategoriesCommandBuilder";
import { AmazonAdCategoryService } from "@/services/amazon/AmazonAdCategoryService";
import { buildCategory } from "../../../support/factories";
import { fakeInteraction } from "../../../support/fakes";
import {
  expectEphemeralEmbed,
  expectEphemeralReply,
  replyPrefix,
} from "../../../support/discord";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([]),
    getByName: vi.fn().mockResolvedValue(null),
    updateActive: vi.fn().mockResolvedValue({}),
  };
  const command = new DiscordCategoriesCommandBuilder(
    service as unknown as AmazonAdCategoryService
  ).build().categories;
  return { service, command };
};

describe("DiscordCategoriesCommandBuilder", () => {
  it("declares the categories command with list/activate/deactivate", () => {
    const json = setup().command.data.toJSON();
    expect(json.name).toBe("categories");
    expect(json.options?.map((o) => o.name)).toEqual([
      "list",
      "activate",
      "deactivate",
    ]);
  });

  it("ignores unknown subcommands", async () => {
    const { command } = setup();
    const { interaction, reply } = fakeInteraction({ subcommand: "nope" });
    await command.execute(interaction);
    expect(reply).not.toHaveBeenCalled();
  });

  describe("list", () => {
    it("splits categories into active and inactive with amazon links", async () => {
      const { command, service } = setup();
      service.getAll.mockResolvedValue([
        buildCategory({ name: "tools", active: true }),
        buildCategory({ name: "garden", active: false }),
      ]);
      const { interaction, reply } = fakeInteraction({ subcommand: "list" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(embed.fields).toEqual([
        { name: "Aktywne", value: "[tools](https://www.amazon.pl/s?i=tools)" },
        {
          name: "Nieaktywne",
          value: "[garden](https://www.amazon.pl/s?i=garden)",
        },
      ]);
    });

    it("shows dashes for empty groups", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({ subcommand: "list" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(
        embed.fields.map(
          (f: { value: string }) => f.value
        )
      ).toEqual(["-", "-"]);
    });

    it("reports loading failures", async () => {
      const { command, service } = setup();
      service.getAll.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({ subcommand: "list" });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie udało się pobrać listy. Error: db`
      );
    });
  });

  describe("activate", () => {
    it("reports unknown categories", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { name: "x" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie znaleziono kategorii o nazwie **x**`
      );
    });

    it("informs when already active", async () => {
      const { command, service } = setup();
      service.getByName.mockResolvedValue(
        buildCategory({ name: "tools", active: true })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { name: "tools" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.info}Kategoria **tools** jest już aktywna`
      );
      expect(service.updateActive).not.toHaveBeenCalled();
    });

    it("activates and confirms", async () => {
      const { command, service } = setup();
      service.getByName.mockResolvedValue(
        buildCategory({ id: 3, name: "tools", active: false })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { name: "tools" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Dodano **tools** do aktywnych kategorii`
      );
      expect(service.updateActive).toHaveBeenCalledWith(3, true);
    });

    it("reports update failures", async () => {
      const { command, service } = setup();
      service.getByName.mockResolvedValue(
        buildCategory({ name: "tools", active: false })
      );
      service.updateActive.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { name: "tools" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Dodawanie nie powiodło się. Error: db`
      );
    });
  });

  describe("deactivate", () => {
    it("reports unknown categories", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { name: "x" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie znaleziono kategorii o nazwie **x**`
      );
    });

    it("informs when already inactive", async () => {
      const { command, service } = setup();
      service.getByName.mockResolvedValue(
        buildCategory({ name: "tools", active: false })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { name: "tools" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.info}Kategoria **tools** nie jest aktywna`
      );
      expect(service.updateActive).not.toHaveBeenCalled();
    });

    it("deactivates and confirms", async () => {
      const { command, service } = setup();
      service.getByName.mockResolvedValue(
        buildCategory({ id: 3, name: "tools", active: true })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { name: "tools" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Usunięto **tools** z aktywnych kategorii`
      );
      expect(service.updateActive).toHaveBeenCalledWith(3, false);
    });

    it("reports update failures", async () => {
      const { command, service } = setup();
      service.getByName.mockResolvedValue(
        buildCategory({ name: "tools", active: true })
      );
      service.updateActive.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { name: "tools" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Usuwanie nie powiodło się. Error: db`
      );
    });
  });
});
