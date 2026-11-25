import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";

const output = (result: object) => ({ stdout: JSON.stringify(result), stderr: "" });
const schema = { type: "object", properties: { verdict: { type: "string" } } };

describe("ClaudeCliService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs claude with only the web tools and the schema and returns its structured output", async () => {
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "token");
    vi.stubEnv("DATABASE_URL", "mysql://secret");
    const execFile = vi.fn().mockResolvedValue(output({ is_error: false, result: "{}", structured_output: { verdict: "NIE" } }));

    await expect(new ClaudeCliService(execFile).run("prompt", "system", schema)).resolves.toEqual({ verdict: "NIE" });

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
      "--json-schema", JSON.stringify(schema),
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

    await expect(new ClaudeCliService(execFile).run("p", "s", schema)).rejects.toThrow("Claude CLI failed: limit reached");
  });

  it("rejects when the process fails", async () => {
    const execFile = vi.fn().mockRejectedValue(new Error("timeout"));

    await expect(new ClaudeCliService(execFile).run("p", "s", schema)).rejects.toThrow("timeout");
  });

  it("rejects when claude returns no structured output", async () => {
    const execFile = vi.fn().mockResolvedValue(output({ is_error: false, result: "Nie mogę ocenić" }));

    await expect(new ClaudeCliService(execFile).run("p", "s", schema)).rejects.toThrow(
      "Claude CLI returned no structured output: Nie mogę ocenić"
    );
  });
});
