import { execFile as execFileCallback, ExecFileOptions } from "node:child_process";
import { promisify } from "node:util";

type ExecFile = (
  file: string,
  args: string[],
  options: ExecFileOptions
) => Promise<{ stdout: string | Buffer }>;

const TOOLS = "WebSearch,WebFetch";

// Runs `claude -p` on the Claude subscription (CLAUDE_CODE_OAUTH_TOKEN) with only the web tools and
// without the server's other env vars, so prompt injection from fetched pages reaches no secrets.
export class ClaudeCliService {
  private execFile;

  constructor(execFile: ExecFile = promisify(execFileCallback) as ExecFile) {
    this.execFile = execFile;
  }

  async run(prompt: string, systemPrompt: string) {
    const { stdout } = await this.execFile(
      "claude",
      [
        "-p", prompt,
        "--append-system-prompt", systemPrompt,
        "--tools", TOOLS,
        "--allowedTools", TOOLS,
        "--model", "sonnet",
        "--max-turns", "15",
        "--no-session-persistence",
        "--output-format", "json",
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

    const output: { is_error: boolean; result: string } = JSON.parse(String(stdout));
    if (output.is_error) throw new Error(`Claude CLI failed: ${output.result}`);
    return output.result;
  }
}
