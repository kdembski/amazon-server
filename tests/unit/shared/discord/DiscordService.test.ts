import { describe, expect, it, vi } from "vitest";
import { WebhookClient } from "discord.js";
import { DiscordService } from "@/shared/discord/DiscordService";
import { fakeSystemLogService } from "../../../support/fakes";

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

  it("builds the webhook url from the env token and sends through it", async () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "123/abc");
    webhookSend.mockResolvedValueOnce(undefined);

    await new DiscordService("DISCORD_LOGS_TOKEN").send("hello");

    expect(WebhookClient).toHaveBeenCalledWith(
      { url: "https://discord.com/api/webhooks/123/abc" },
      { rest: { retries: 0, timeout: 60_000 } }
    );
    expect(webhookSend).toHaveBeenCalledTimes(1);
    expect(webhookSend).toHaveBeenCalledWith("hello");
  });

  it("retries a failed send after the configured delays until it succeeds", async () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "123/abc");
    vi.useFakeTimers();
    const logger = fakeSystemLogService();
    webhookSend
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementationOnce(() => {
        throw new Error("sync");
      })
      .mockResolvedValueOnce(undefined);

    const sending = new DiscordService(
      "DISCORD_LOGS_TOKEN",
      [100, 200],
      logger.service
    ).send("x");

    await vi.advanceTimersByTimeAsync(99);
    expect(webhookSend).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(webhookSend).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(200);
    await sending;

    expect(webhookSend).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenNthCalledWith(
      2,
      "DiscordService",
      "Discord send failed, retrying",
      {
        error: new Error("sync"),
        webhook: "DISCORD_LOGS_TOKEN",
        attempt: 2,
        payload: { content: "x" },
        retryInMs: 200,
      }
    );
    expect(logger.error).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("logs every failure and resolves once all retries are exhausted", async () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "123/abc");
    const logger = fakeSystemLogService();
    webhookSend
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"));

    await expect(
      new DiscordService("DISCORD_LOGS_TOKEN", [0, 0], logger.service).send({
        content: "c",
        embeds: [{ title: "Daily status" }],
      })
    ).resolves.toBeUndefined();

    expect(webhookSend).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      "DiscordService",
      "Discord message was not sent after all retries",
      {
        error: new Error("network"),
        webhook: "DISCORD_LOGS_TOKEN",
        attempt: 3,
        payload: { content: "c", embedTitles: ["Daily status"] },
      }
    );
  });
});
