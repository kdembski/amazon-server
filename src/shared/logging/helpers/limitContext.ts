import { Prisma } from "@prisma/client";
import { isSecretKey, redactText } from "@/shared/logging/helpers/redact";
import { serializeError } from "@/shared/logging/helpers/serializeError";

const MAX_STRING = 2_000;
const MAX_ARRAY = 50;
const MAX_DEPTH = 6;
const MAX_JSON = 16_384;

export function limitText(text: string) {
  const redacted = redactText(text);
  if (redacted.length <= MAX_STRING) return redacted;

  return `${redacted.slice(0, MAX_STRING)}…[truncated ${redacted.length - MAX_STRING} chars]`;
}

export function limitContext(
  context: Record<string, unknown>
): Prisma.InputJsonObject {
  const json = JSON.stringify(prune(context, 0));
  if (json.length > MAX_JSON) return { truncated: json.slice(0, MAX_JSON) };

  return JSON.parse(json);
}

function prune(value: unknown, depth: number): unknown {
  if (value instanceof Error) return prune(serializeError(value), depth);
  if (typeof value === "string") return limitText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object" || value === null) return value;

  const { toJSON } = value as { toJSON?: unknown };
  if (typeof toJSON === "function") return prune(toJSON.call(value), depth);
  if (depth >= MAX_DEPTH) return "[depth limit]";

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => prune(item, depth + 1));
    return value.length > MAX_ARRAY
      ? [...items, `[${value.length - MAX_ARRAY} more items]`]
      : items;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSecretKey(key) ? "[redacted]" : prune(item, depth + 1),
    ])
  );
}
