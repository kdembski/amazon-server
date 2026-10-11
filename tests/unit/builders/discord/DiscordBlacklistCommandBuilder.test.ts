import { describe, expect, it, vi } from "vitest";
import { DiscordBlacklistCommandBuilder } from "@/builders/discord/DiscordBlacklistCommandBuilder";
import { BlacklistedKeywordService } from "@/services/blacklist/BlacklistedKeywordService";
import { buildKeyword } from "../../../support/factories";
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
  const command = new DiscordBlacklistCommandBuilder(
    service as unknown as BlacklistedKeywordService
  ).build().blacklist;
  return { service, command };
};

describe("DiscordBlacklistCommandBuilder", () => {
  it("declares the blacklist command with show/add/remove subcommands", () => {
    const { command } = setup();
    const json = command.data.toJSON();
    expect(json.name).toBe("blacklist");
    expect(json.options?.map((o) => o.name)).toEqual(["show", "add", "remove"]);
  });

  it("ignores unknown subcommands", async () => {
    const { command } = setup();
    const { interaction, reply } = fakeInteraction({ subcommand: "nope" });
    await command.execute(interaction);
    expect(reply).not.toHaveBeenCalled();
  });

  describe("show", () => {
    it("lists keywords in an ephemeral embed", async () => {
      const { command, service } = setup();
      service.getAll.mockResolvedValue([
        buildKeyword({ value: "used" }),
        buildKeyword({ value: "refurb" }),
      ]);
      const { interaction, reply } = fakeInteraction({ subcommand: "show" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(embed.fields[0]).toEqual({
        name: "Keywordy",
        value: "*used*, *refurb*",
      });
    });

    it("shows a dash when the list is empty", async () => {
      const { command } = setup();
      const { interaction, reply } = fakeInteraction({ subcommand: "show" });

      await command.execute(interaction);

      const embed = await expectEphemeralEmbed(reply);
      expect(embed.fields[0].value).toBe("-");
    });

    it("replies with an error when loading fails", async () => {
      const { command, service } = setup();
      service.getAll.mockRejectedValue(new Error("db"));
      const { interaction, reply } = fakeInteraction({ subcommand: "show" });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Nie udało się pobrać keywordów. Error: db`
      );
    });
  });

  describe("add", () => {
    it("rejects keywords with whitespace", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { keyword: "a b" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Keyword nie powinien zawierać spacji`
      );
      expect(service.creatable.create).not.toHaveBeenCalled();
    });

    it("rejects duplicates", async () => {
      const { command, service } = setup();
      service.getByValue.mockResolvedValue(buildKeyword({ value: "used" }));
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { keyword: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Keyword **used** jest już na liście`
      );
      expect(service.creatable.create).not.toHaveBeenCalled();
    });

    it("creates the keyword and confirms", async () => {
      const { command, service } = setup();
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { keyword: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(reply, `${replyPrefix.ok}Dodano **used** do blacklisty`);
      expect(service.creatable.create).toHaveBeenCalledWith({ value: "used" });
    });

    it("reports creation failures", async () => {
      const { command, service } = setup();
      service.creatable.create.mockRejectedValue(new Error("dup"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "add",
        strings: { keyword: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Dodawanie nie powiodło się. Error: dup`
      );
    });
  });

  describe("remove", () => {
    it("deletes the keyword and confirms", async () => {
      const { command, service } = setup();
      service.getByValue.mockResolvedValue(
        buildKeyword({ id: 4, value: "used" })
      );
      const { interaction, reply } = fakeInteraction({
        subcommand: "remove",
        strings: { keyword: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(reply, `${replyPrefix.ok}Usunięto **used** z blacklisty`);
      expect(service.deletable.delete).toHaveBeenCalledWith(4);
    });

    it("reports deletion failures", async () => {
      const { command, service } = setup();
      service.getByValue.mockResolvedValue(
        buildKeyword({ id: 4, value: "used" })
      );
      service.deletable.delete.mockRejectedValue(new Error("fk"));
      const { interaction, reply } = fakeInteraction({
        subcommand: "remove",
        strings: { keyword: "used" },
      });

      await command.execute(interaction);

      await expectEphemeralReply(
        reply,
        `${replyPrefix.error}Usuwanie nie powiodło się. Error: fk`
      );
    });
  });
});
