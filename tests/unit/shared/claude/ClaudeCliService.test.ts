import { afterEach, describe, expect, it, vi } from "vitest";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";

const schema = { type: "object", properties: { verdict: { type: "string" } } };

const setup = (result: Promise<object> | object) => {
  const end = vi.fn();
  const execFile = vi.fn(() => {
    const stdout = (lines: object) => ({ stdout: [{ type: "system" }, lines].map((line) => JSON.stringify(line)).join("\n") });
    const promise = result instanceof Promise ? result : Promise.resolve(stdout({ type: "result", ...result }));
    return Object.assign(promise, { child: { stdin: { end } } });
  });
  return { service: new ClaudeCliService(execFile as never), execFile, end };
};

const sentMessage = (end: ReturnType<typeof vi.fn>) => JSON.parse(end.mock.calls[0][0]);

describe("ClaudeCliService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs claude with only the web tools and the schema and returns its structured output", async () => {
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "token");
    vi.stubEnv("DATABASE_URL", "mysql://secret");
    const { service, execFile, end } = setup({ is_error: false, result: "{}", structured_output: { verdict: "NIE" } });

    await expect(service.run("prompt", "system", schema)).resolves.toEqual({ verdict: "NIE" });

    const [file, args, options] = execFile.mock.calls[0] as unknown as [string, string[], { timeout: number; env: object }];
    expect(file).toBe("claude");
    expect(args).toEqual([
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
      "--append-system-prompt", "system",
      "--tools", "WebSearch,WebFetch",
      "--allowedTools", "WebSearch,WebFetch",
      "--model", "sonnet",
      "--max-turns", "15",
      "--no-session-persistence",
      "--json-schema", JSON.stringify(schema),
    ]);
    expect(options.timeout).toBe(300_000);
    expect(options.env).toEqual({
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      CLAUDE_CODE_OAUTH_TOKEN: "token",
    });
    expect(sentMessage(end)).toEqual({
      type: "user",
      message: { role: "user", content: [{ type: "text", text: "prompt" }] },
    });
    expect(end.mock.calls[0][0].endsWith("\n")).toBe(true);
  });

  it("sends the image by URL before the prompt", async () => {
    const { service, end } = setup({ is_error: false, result: "{}", structured_output: {} });

    await service.run("prompt", "system", schema, "https://m.media-amazon.com/images/I/a.jpg");

    expect(sentMessage(end).message.content).toEqual([
      { type: "image", source: { type: "url", url: "https://m.media-amazon.com/images/I/a.jpg" } },
      { type: "text", text: "prompt" },
    ]);
  });

  it("rejects when claude reports an error", async () => {
    const { service } = setup({ is_error: true, result: "limit reached" });

    await expect(service.run("p", "s", schema)).rejects.toThrow("Claude CLI failed: limit reached");
  });

  it("rejects when the process fails", async () => {
    const { service } = setup(Promise.reject(new Error("timeout")));

    await expect(service.run("p", "s", schema)).rejects.toThrow("timeout");
  });

  it("rejects when claude returns no structured output", async () => {
    const { service } = setup({ is_error: false, result: "Nie mogę ocenić" });

    await expect(service.run("p", "s", schema)).rejects.toThrow(
      "Claude CLI returned no structured output: Nie mogę ocenić"
    );
  });

  it("rejects when claude returns no result message", async () => {
    const { service } = setup(Promise.resolve({ stdout: JSON.stringify({ type: "system" }) }));

    await expect(service.run("p", "s", schema)).rejects.toThrow("Claude CLI returned no result");
  });
});
