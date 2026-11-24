import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";

const output = (result: object) => ({ stdout: JSON.stringify(result), stderr: "" });

describe("ClaudeCliService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs claude with only the web tools and returns its result", async () => {
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "token");
    vi.stubEnv("DATABASE_URL", "mysql://secret");
    const execFile = vi.fn().mockResolvedValue(output({ is_error: false, result: "**Werdykt: NIE**" }));

    await expect(new ClaudeCliService(execFile).run("prompt", "system")).resolves.toBe("**Werdykt: NIE**");

    const [file, args, options] = execFile.mock.calls[0];
    expect(file).toBe("claude");
    expect(args).toEqual([
      "-p", "prompt",
      "--append-system-prompt", "system",
      "--tools", "WebSearch,WebFetch",
      "--allowedTools", "WebSearch,WebFetch",
      "--model", "sonnet",
      "--max-turns", "15",
      "--no-session-persistence",
      "--output-format", "json",
    ]);
    expect(options.timeout).toBe(300_000);
    expect(options.env).toEqual({
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      CLAUDE_CODE_OAUTH_TOKEN: "token",
    });
  });

  it("rejects when claude reports an error", async () => {
    const execFile = vi.fn().mockResolvedValue(output({ is_error: true, result: "limit reached" }));

    await expect(new ClaudeCliService(execFile).run("p", "s")).rejects.toThrow("Claude CLI failed: limit reached");
  });

  it("rejects when the process fails", async () => {
    const execFile = vi.fn().mockRejectedValue(new Error("timeout"));

    await expect(new ClaudeCliService(execFile).run("p", "s")).rejects.toThrow("timeout");
  });
});
