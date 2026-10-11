import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Routes,
} from "discord.js";
import { DiscordCommandService } from "@/services/discord/DiscordCommandService";
import { fakeInteraction, resetSingleton } from "../../../support/fakes";

const {
  clientLogin,
  clientOn,
  restPut,
  restSetToken,
  executeBlacklist,
  executeCategories,
  executeCountries,
  fakeBuilder,
} = vi.hoisted(() => {
  const fakeBuilder = (name: string, execute: ReturnType<typeof vi.fn>) =>
    vi.fn(function () {
      return {
        build: () => ({
          [name]: { data: { toJSON: () => ({ name }) }, execute },
        }),
      };
    });

  // Implementations are passed to vi.fn() directly (not via mockResolvedValue)
  // so that vi.restoreAllMocks() in afterEach keeps them.
  const restPut = vi.fn(async () => ({}));

  return {
    clientLogin: vi.fn(async () => "token"),
    clientOn: vi.fn(),
    restPut,
    restSetToken: vi.fn(() => ({ put: restPut })),
    executeBlacklist: vi.fn(async () => undefined),
    executeCategories: vi.fn(async () => undefined),
    executeCountries: vi.fn(async () => undefined),
    fakeBuilder,
  };
});

vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return {
    ...original,
    Client: vi.fn(function () {
      return { login: clientLogin, on: clientOn };
    }),
    REST: vi.fn(function () {
      return { setToken: restSetToken };
    }),
  };
});

vi.mock("@/builders/discord/DiscordBlacklistCommandBuilder", () => ({
  DiscordBlacklistCommandBuilder: fakeBuilder("blacklist", executeBlacklist),
}));
vi.mock("@/builders/discord/DiscordCategoriesCommandBuilder", () => ({
  DiscordCategoriesCommandBuilder: fakeBuilder("categories", executeCategories),
}));
vi.mock("@/builders/discord/DiscordCountriesCommandBuilder", () => ({
  DiscordCountriesCommandBuilder: fakeBuilder("countries", executeCountries),
}));

type Handler = (interaction: unknown) => Promise<void>;

const loginWithEnv = async () => {
  vi.stubEnv("DISCORD_BOT_TOKEN", "bot-token");
  vi.stubEnv("DISCORD_APP_ID", "app");
  vi.stubEnv("DISCORD_SERVER_ID", "guild");
  await DiscordCommandService.getInstance().login();
  const handler = clientOn.mock.calls.find(
    ([event]) => event === Events.InteractionCreate
  )![1] as Handler;
  return { handler };
};

describe("DiscordCommandService", () => {
  beforeEach(() => {
    resetSingleton(DiscordCommandService);
    vi.stubEnv("DISCORD_BOT_TOKEN", "");
    vi.stubEnv("DISCORD_APP_ID", "");
    vi.stubEnv("DISCORD_SERVER_ID", "");
    // Every successful login logs the registration result; keep stdout quiet
    // regardless of test order.
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("is a singleton", () => {
    expect(DiscordCommandService.getInstance()).toBe(
      DiscordCommandService.getInstance()
    );
  });

  it("logs in, listens for interactions and registers guild commands", async () => {
    const log = vi.spyOn(console, "log");

    await loginWithEnv();

    expect(Client).toHaveBeenCalledWith({ intents: [GatewayIntentBits.Guilds] });
    expect(clientLogin).toHaveBeenCalledWith("bot-token");
    expect(clientOn).toHaveBeenCalledWith(
      Events.InteractionCreate,
      expect.any(Function)
    );
    expect(restSetToken).toHaveBeenCalledWith("bot-token");
    expect(restPut).toHaveBeenCalledWith(
      Routes.applicationGuildCommands("app", "guild"),
      { body: [{ name: "countries" }, { name: "categories" }, { name: "blacklist" }] }
    );
    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith("Successfully reloaded commands.")
    );
  });

  it("skips registration when env variables are missing", async () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "bot-token");

    await DiscordCommandService.getInstance().login();

    expect(clientLogin).toHaveBeenCalledWith("bot-token");
    expect(restPut).not.toHaveBeenCalled();
  });

  it("logs registration failures", async () => {
    const error = vi.spyOn(console, "error");
    restPut.mockRejectedValueOnce(new Error("403"));

    await loginWithEnv();

    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith("DiscordCommandService: Error: 403")
    );
  });

  describe("interaction handler", () => {
    it("ignores non chat-input interactions", async () => {
      const { handler } = await loginWithEnv();
      const { interaction, reply } = fakeInteraction({
        commandName: "blacklist",
        isChatInputCommand: false,
      });

      await handler(interaction);

      expect(executeBlacklist).not.toHaveBeenCalled();
      expect(reply).not.toHaveBeenCalled();
    });

    it("logs unknown commands", async () => {
      const error = vi.spyOn(console, "error");
      const { handler } = await loginWithEnv();
      const { interaction, reply } = fakeInteraction({ commandName: "nope" });

      await handler(interaction);

      expect(error).toHaveBeenCalledWith(
        "DiscordCommandService: command nope not found"
      );
      expect(reply).not.toHaveBeenCalled();
    });

    it("executes the matching command", async () => {
      const { handler } = await loginWithEnv();
      const { interaction } = fakeInteraction({ commandName: "categories" });

      await handler(interaction);

      expect(executeCategories).toHaveBeenCalledWith(interaction);
      expect(executeBlacklist).not.toHaveBeenCalled();
      expect(executeCountries).not.toHaveBeenCalled();
    });

    it("replies with an ephemeral error when execution throws", async () => {
      const error = vi.spyOn(console, "error");
      executeCountries.mockRejectedValueOnce(new Error("boom"));
      const { handler } = await loginWithEnv();
      const { interaction, reply, followUp } = fakeInteraction({
        commandName: "countries",
      });

      await handler(interaction);

      expect(error).toHaveBeenCalledWith("DiscordCommandService: Error: boom");
      expect(reply).toHaveBeenCalledWith({
        content: "*Wystapił bład podaczas wykonywania komendy*",
        flags: MessageFlags.Ephemeral,
      });
      expect(followUp).not.toHaveBeenCalled();
    });

    it.each([{ replied: true }, { deferred: true }])(
      "follows up instead of replying when the interaction state is %o",
      async (state) => {
        executeCountries.mockRejectedValueOnce(new Error("boom"));
        const { handler } = await loginWithEnv();
        const { interaction, reply, followUp } = fakeInteraction({
          commandName: "countries",
          ...state,
        });

        await handler(interaction);

        expect(followUp).toHaveBeenCalledWith({
          content: "*Wystapił bład podaczas wykonywania komendy*",
          flags: MessageFlags.Ephemeral,
        });
        expect(reply).not.toHaveBeenCalled();
      }
    );
  });
});
