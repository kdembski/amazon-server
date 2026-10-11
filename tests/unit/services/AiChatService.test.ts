import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiChatService } from "@/services/AiChatService";
import { resetSingleton } from "../../support/fakes";

const { question } = vi.hoisted(() => ({ question: vi.fn() }));

vi.mock("hercai", () => ({
  Hercai: vi.fn(function () {
    return { question };
  }),
}));

describe("AiChatService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSingleton(AiChatService);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is a singleton", () => {
    expect(AiChatService.getInstance()).toBe(AiChatService.getInstance());
  });

  it("asks hercai with the v3 model and resolves with the response", async () => {
    question.mockResolvedValue({ reply: "ok" });

    await expect(AiChatService.getInstance().ask("hi")).resolves.toEqual({
      reply: "ok",
    });
    expect(question).toHaveBeenCalledWith({ model: "v3", content: "hi" });
  });

  it("throttles consecutive requests by 10 seconds", async () => {
    question.mockResolvedValue({ reply: "ok" });
    const service = AiChatService.getInstance();

    const first = service.ask("a");
    const second = service.ask("b");
    expect(question).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(question).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(question).toHaveBeenCalledTimes(2);
    await Promise.all([first, second]);
  });

  it("resolves undefined and logs when hercai fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    question.mockRejectedValue({ status: 500, message: "down" });

    await expect(
      AiChatService.getInstance().ask("hi")
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(500, "down");
  });

  it("getProductName returns the reply and embeds the ad name in the prompt", async () => {
    question.mockResolvedValue({ reply: "Sony WH-1000XM5" });

    await expect(
      AiChatService.getInstance().getProductName(
        "Sony WH-1000XM5 Headphones Black"
      )
    ).resolves.toBe("Sony WH-1000XM5");
    expect(question.mock.calls[0][0].content).toContain(
      '"Sony WH-1000XM5 Headphones Black"'
    );
  });

  it.each([
    { reply: "" },
    { reply: "Question Error!" },
  ])("getProductName returns undefined for reply $reply", async ({ reply }) => {
    question.mockResolvedValueOnce({ reply });

    await expect(
      AiChatService.getInstance().getProductName("x")
    ).resolves.toBeUndefined();
  });

  it("getProductName returns undefined when hercai fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    question.mockRejectedValueOnce({ status: 500, message: "down" });

    await expect(
      AiChatService.getInstance().getProductName("x")
    ).resolves.toBeUndefined();
  });
});
