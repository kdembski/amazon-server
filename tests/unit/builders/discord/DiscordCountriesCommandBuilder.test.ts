import { describe, expect, it, vi } from "vitest";
import { DiscordCountriesCommandBuilder } from "@/builders/discord/DiscordCountriesCommandBuilder";
import { CountryService } from "@/services/currency/CountryService";
import { getSpacing } from "@/helpers/discord";
import { buildCountry } from "../../../support/factories";
import { fakeInteraction } from "../../../support/fakes";
import {
  expectEphemeralEmbed,
  expectEphemeralReply,
  replyPrefix,
} from "../../../support/discord";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([]),
    getByCode: vi.fn().mockResolvedValue(null),
    updateActive: vi.fn().mockResolvedValue({}),
  };
  const command = new DiscordCountriesCommandBuilder(
    service as unknown as CountryService
  ).build().countries;
  return { service, command };
};

describe("DiscordCountriesCommandBuilder", () => {
  it("declares the countries command with list/activate/deactivate", () => {
    const json = setup().command.data.toJSON();
    expect(json.name).toBe("countries");
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
    it("splits countries into active and inactive", async () => {
      const { command, service } = setup();
      service.getAll.mockResolvedValue([
        buildCountry({ name: "Poland", code: "pl", active: true }),
        buildCountry({ name: "Germany", code: "de", active: true }),
        buildCountry({ name: "Sweden", code: "se", active: false }),
      ]);
      const { interaction, reply } = fakeInteraction({ subcommand: "list" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(embed.fields).toEqual([
        {
          name: "Aktywne",
          value: ["Poland **(pl)**", "Germany **(de)**"].join(getSpacing(4)),
        },
        { name: "Nieaktywne", value: "Sweden **(se)**" },
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
    it("reports unknown codes", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { code: "xx" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie znaleziono rynku z kodem **xx**`
      );
    });

    it("informs when already active", async () => {
      const { command, service } = setup();
      service.getByCode.mockResolvedValue(
        buildCountry({ name: "Poland", active: true })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { code: "pl" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(reply, `${replyPrefix.info}Rynek **Poland** jest już aktywny`);
      expect(service.updateActive).not.toHaveBeenCalled();
    });

    it("activates and confirms", async () => {
      const { command, service } = setup();
      service.getByCode.mockResolvedValue(
        buildCountry({ id: 2, name: "Poland", active: false })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { code: "pl" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Dodano **Poland** do aktywnych rynków`
      );
      expect(service.updateActive).toHaveBeenCalledWith(2, true);
    });

    it("reports update failures", async () => {
      const { command, service } = setup();
      service.getByCode.mockResolvedValue(
        buildCountry({ name: "Poland", active: false })
      );
      service.updateActive.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "activate",
        strings: { code: "pl" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Dodawanie nie powiodło się. Error: db`
      );
    });
  });

  describe("deactivate", () => {
    it("reports unknown codes", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { code: "xx" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie znaleziono rynku z kodem **xx**`
      );
    });

    it("informs when already inactive", async () => {
      const { command, service } = setup();
      service.getByCode.mockResolvedValue(
        buildCountry({ name: "Poland", active: false })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { code: "pl" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(reply, `${replyPrefix.info}Rynek **Poland** nie jest aktywny`);
      expect(service.updateActive).not.toHaveBeenCalled();
    });

    it("deactivates and confirms", async () => {
      const { command, service } = setup();
      service.getByCode.mockResolvedValue(
        buildCountry({ id: 2, name: "Poland", active: true })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { code: "pl" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Usunięto **Poland** z aktywnych rynków`
      );
      expect(service.updateActive).toHaveBeenCalledWith(2, false);
    });

    it("reports update failures", async () => {
      const { command, service } = setup();
      service.getByCode.mockResolvedValue(
        buildCountry({ name: "Poland", active: true })
      );
      service.updateActive.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "deactivate",
        strings: { code: "pl" },
      });
      await command.execute(interaction);
      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Usuwanie nie powiodło się. Error: db`
      );
    });
  });
});
