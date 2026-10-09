import { describe, expect, it, vi } from "vitest";
import { WebhookClient } from "discord.js";
import { DiscordService } from "@/services/discord/DiscordService";

const { webhookSend } = vi.hoisted(() => ({ webhookSend: vi.fn() }));

// The real WebhookClient validates the webhook URL shape; the mock skips that
// on purpose so the test can focus on how DiscordService assembles the URL.
vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return {
    ...original,
    WebhookClient: vi.fn(function () {
      return { send: webhookSend };
    }),
  };
});

describe("DiscordService", () => {
  it("throws on send when no client was initialized", () => {
    expect(() => new DiscordService().send("hi")).toThrow(
      "Client has not been initialized"
    );
  });

  it("throws when the env variable is missing", () => {
    vi.stubEnv("DISCORD_MISSING_TOKEN", "");

    expect(() => new DiscordService("DISCORD_MISSING_TOKEN")).toThrow(
      "DISCORD_MISSING_TOKEN env variable is missing"
    );
  });

  it("builds the webhook url from the env token and sends through it", () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "123/abc");

    new DiscordService("DISCORD_LOGS_TOKEN").send("hello");

    expect(WebhookClient).toHaveBeenCalledWith({
      url: "https://discord.com/api/webhooks/123/abc",
    });
    expect(webhookSend).toHaveBeenCalledWith("hello");
  });

  it("logs instead of throwing when the webhook send fails synchronously", () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "123/abc");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    webhookSend.mockImplementationOnce(() => {
      throw new Error("network");
    });

    expect(() =>
      new DiscordService("DISCORD_LOGS_TOKEN").send("x")
    ).not.toThrow();
    expect(error).toHaveBeenCalledWith(expect.any(Error));
  });
});
