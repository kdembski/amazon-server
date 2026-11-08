import { Prisma } from "@prisma/client";

const SECRET_KEY = /token|password|secret|authorization|api[-_]?key/i;
const MAX_STRING = 2_000;
const MAX_ARRAY = 50;
const MAX_DEPTH = 6;
const MAX_JSON = 16_384;

// Shrinks log messages and contexts to what fits a SystemLog row and hides secrets in them
export class LogContextSanitizer {
  limitText(text: string) {
    const redacted = this.redactText(text);
    if (redacted.length <= MAX_STRING) return redacted;

    return `${redacted.slice(0, MAX_STRING)}…[truncated ${redacted.length - MAX_STRING} chars]`;
  }

  limitContext(context: Record<string, unknown>): Prisma.InputJsonObject {
    const json = JSON.stringify(this.prune(context, 0));
    if (json.length > MAX_JSON) return { truncated: json.slice(0, MAX_JSON) };

    return JSON.parse(json);
  }

  redactText(text: string) {
    return text
      .replace(/\/api\/webhooks\/[^\s"'?]+/g, "/api/webhooks/[redacted]")
      .replace(/(\w+:\/\/)[^\s/@"']+@/g, "$1[redacted]@");
  }

  isSecretKey(key: string) {
    return SECRET_KEY.test(key);
  }

  serializeError(error: unknown, depth = 3): Record<string, unknown> {
    if (typeof error !== "object" || error === null) {
      return { message: String(error) };
    }

    const { name, message, stack, code, meta, status, cause } = error as Record<string, unknown>;

    return {
      name,
      message,
      stack,
      code,
      meta,
      status,
      cause: cause === undefined || depth <= 1 ? undefined : this.serializeError(cause, depth - 1),
    };
  }

  private prune(value: unknown, depth: number): unknown {
    if (value instanceof Error) return this.prune(this.serializeError(value), depth);
    if (typeof value === "string") return this.limitText(value);
    if (typeof value === "bigint") return value.toString();
    if (typeof value !== "object" || value === null) return value;

    const { toJSON } = value as { toJSON?: unknown };
    if (typeof toJSON === "function") return this.prune(toJSON.call(value), depth);
    if (depth >= MAX_DEPTH) return "[depth limit]";

    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY).map((item) => this.prune(item, depth + 1));
      return value.length > MAX_ARRAY ? [...items, `[${value.length - MAX_ARRAY} more items]`] : items;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        this.isSecretKey(key) ? "[redacted]" : this.prune(item, depth + 1),
      ])
    );
  }
}
