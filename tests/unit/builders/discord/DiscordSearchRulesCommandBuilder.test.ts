import { describe, expect, it, vi } from "vitest";
import { DiscordSearchRulesCommandBuilder } from "@/builders/discord/DiscordSearchRulesCommandBuilder";
import { SearchRuleService } from "@/services/search-rule/SearchRuleService";
import { buildSearchRule } from "../../../support/factories";
import { fakeInteraction } from "../../../support/fakes";
import {
  expectEphemeralEmbed,
  expectEphemeralReply,
  replyPrefix,
} from "../../../support/discord";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([]),
    getByValue: vi.fn().mockResolvedValue(null),
    creatable: { create: vi.fn().mockResolvedValue({}) },
    deletable: { delete: vi.fn().mockResolvedValue({}) },
  };
  const command = new DiscordSearchRulesCommandBuilder(
    service as unknown as SearchRuleService
  ).build().rules;
  return { service, command };
};

describe("DiscordSearchRulesCommandBuilder", () => {
  it("declares the rules command with show/add/remove subcommands", () => {
    const { command } = setup();
    const json = command.data.toJSON();
    expect(json.name).toBe("rules");
    expect(json.options?.map((o) => o.name)).toEqual(["show", "add", "remove"]);
  });

  it("ignores unknown subcommands", async () => {
    const { command } = setup();
    const { interaction, reply } = fakeInteraction({ subcommand: "nope" });
    await command.execute(interaction);
    expect(reply).not.toHaveBeenCalled();
  });

  describe("show", () => {
    it("lists rules and global exclusions separately in an ephemeral embed", async () => {
      const { command, service } = setup();
      service.getAll.mockResolvedValue([
        buildSearchRule({ value: "sony" }),
        buildSearchRule({ value: "!used|refurb" }),
        buildSearchRule({ value: "rtx+4090+!laptop" }),
        buildSearchRule({ value: "a++b" }),
      ]);
      const { interaction, reply } = fakeInteraction({ subcommand: "show" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(embed.title).toBe("Zasady wyszukiwania");
      expect(embed.description).toContain("pasuje do co najmniej jednej zasady");
      expect(embed.description).toContain("`!a` – nie może zawierać *a*");
      expect(embed.fields).toEqual([
        { name: "Zasady", value: "`sony`, `rtx+4090+!laptop`, `a++b`" },
        { name: "Globalne wykluczenia", value: "`!used|refurb`" },
      ]);
    });

    it("shows a dash when the list is empty", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({ subcommand: "show" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(embed.fields.map((field: { value: string }) => field.value)).toEqual(["-", "-"]);
    });

    it("replies with an error when loading fails", async () => {
      const { command, service } = setup();
      service.getAll.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({ subcommand: "show" });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie udało się pobrać zasad. Error: db`
      );
    });
  });

  describe("add", () => {
    it("rejects rules that fail to parse", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "a++b" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Zasada **a++b** zawiera pusty fragment`
      );
      expect(service.creatable.create).not.toHaveBeenCalled();
    });

    it("rejects rules longer than the column allows", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "a".repeat(64) },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Zasada może mieć maksymalnie 63 znaki`
      );
      expect(service.creatable.create).not.toHaveBeenCalled();
    });

    it("trims the rule and describes it after creating", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "  open box+4090|4080+!laptop " },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Dodano **open box+4090|4080+!laptop**: musi zawierać: *open box*; *4090* lub *4080*; nie może zawierać: *laptop*. Oferty zostaną przeliczone w tle w ciągu kilku minut.`
      );
      expect(service.getByValue).toHaveBeenCalledWith("open box+4090|4080+!laptop");
      expect(service.creatable.create).toHaveBeenCalledWith({
        value: "open box+4090|4080+!laptop",
      });
    });

    it("describes a global exclusion after creating", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "!used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Dodano **!used**: globalnie wyklucza: *used*. Oferty zostaną przeliczone w tle w ciągu kilku minut.`
      );
    });

    it("rejects duplicates", async () => {
      const { command, service } = setup();
      service.getByValue.mockResolvedValue(buildSearchRule({ value: "used" }));
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Zasada **used** jest już na liście`
      );
      expect(service.creatable.create).not.toHaveBeenCalled();
    });

    it("creates the rule and confirms", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.ok}Dodano **used**: musi zawierać: *used*. Oferty zostaną przeliczone w tle w ciągu kilku minut.`
      );
      expect(service.creatable.create).toHaveBeenCalledWith({ value: "used" });
    });

    it("reports creation failures", async () => {
      const { command, service } = setup();
      service.creatable.create.mockRejectedValue(new Error("dup"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { rule: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Dodawanie nie powiodło się. Error: dup`
      );
    });
  });

  describe("remove", () => {
    it("reports unknown rules by value", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "remove",
        strings: { rule: "ghost" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie znaleziono zasady **ghost**`
      );
      expect(service.deletable.delete).not.toHaveBeenCalled();
    });

    it("deletes the rule and confirms", async () => {
      const { command, service } = setup();
      service.getByValue.mockResolvedValue(
        buildSearchRule({ id: 4, value: "used" })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "remove",
        strings: { rule: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(reply, `${replyPrefix.ok}Usunięto **used** z zasad. Oferty zostaną przeliczone w tle w ciągu kilku minut.`);
      expect(service.deletable.delete).toHaveBeenCalledWith(4);
    });

    it("reports deletion failures", async () => {
      const { command, service } = setup();
      service.getByValue.mockResolvedValue(
        buildSearchRule({ id: 4, value: "used" })
      );
      service.deletable.delete.mockRejectedValue(new Error("fk"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "remove",
        strings: { rule: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Usuwanie nie powiodło się. Error: fk`
      );
    });
  });
});
