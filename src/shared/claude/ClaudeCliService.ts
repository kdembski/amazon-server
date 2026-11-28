import { execFile as execFileCallback, ExecFileOptions } from "node:child_process";
import { promisify } from "node:util";

type ExecFile = (
  file: string,
  args: string[],
  options: ExecFileOptions
) => Promise<{ stdout: string | Buffer }> & { child: { stdin: { end(input: string): void } | null } };

interface ClaudeCliResult {
  type: string;
  is_error: boolean;
  result: string;
  structured_output?: unknown;
}

const TOOLS = "WebSearch,WebFetch";

// Runs `claude -p` on the Claude subscription (CLAUDE_CODE_OAUTH_TOKEN) with only the web tools and
// without the server's other env vars, so prompt injection from fetched pages reaches no secrets.
export class ClaudeCliService {
  private execFile;

  constructor(execFile: ExecFile = promisify(execFileCallback) as unknown as ExecFile) {
    this.execFile = execFile;
  }

  // Resolves with the answer matching `schema` (--json-schema); the image goes in by URL.
  async run(prompt: string, systemPrompt: string, schema: object, imageUrl?: string): Promise<unknown> {
    const cli = this.execFile(
      "claude",
      [
        "-p",
        "--input-format", "stream-json",
        "--output-format", "stream-json",
        "--verbose",
        "--append-system-prompt", systemPrompt,
        "--tools", TOOLS,
        "--allowedTools", TOOLS,
        "--model", "sonnet",
        "--max-turns", "15",
        "--no-session-persistence",
        "--json-schema", JSON.stringify(schema),
      ],
      {
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
        },
      }
    );
    const image = imageUrl ? [{ type: "image", source: { type: "url", url: imageUrl } }] : [];
    const content = [...image, { type: "text", text: prompt }];
    cli.child.stdin?.end(`${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`);
    const { stdout } = await cli;

    const output = this.getResult(String(stdout));
    if (output.is_error) throw new Error(`Claude CLI failed: ${output.result}`);
    if (output.structured_output === undefined) {
      throw new Error(`Claude CLI returned no structured output: ${output.result}`);
    }
    return output.structured_output;
  }

  private getResult(stdout: string) {
    const messages: ClaudeCliResult[] = stdout.trim().split("\n").map((line) => JSON.parse(line));
    const result = messages.find((message) => message.type === "result");
    if (!result) throw new Error("Claude CLI returned no result");
    return result;
  }
}
