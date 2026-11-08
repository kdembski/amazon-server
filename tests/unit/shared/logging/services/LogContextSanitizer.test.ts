import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { LogContextSanitizer } from "@/shared/logging/services/LogContextSanitizer";

const sanitizer = new LogContextSanitizer();
const limitText = (text: string) => sanitizer.limitText(text);
const limitContext = (context: Record<string, unknown>) => sanitizer.limitContext(context);
const redactText = (text: string) => sanitizer.redactText(text);
const isSecretKey = (key: string) => sanitizer.isSecretKey(key);
const serializeError = (error: unknown, depth?: number) => sanitizer.serializeError(error, depth);

describe("limitText", () => {
  it("cuts long text and redacts it", () => {
    const text = limitText("/api/webhooks/1/t " + "a".repeat(3_000));

    expect(text.startsWith("/api/webhooks/[redacted] ")).toBe(true);
    expect(text).toMatch(/…\[truncated \d+ chars\]$/);
    expect(text.length).toBeLessThan(2_050);
  });
});

describe("limitContext", () => {
  it("serializes errors, dates, decimals and bigints", () => {
    const error = new Error("boom");

    expect(
      limitContext({
        error,
        at: new Date("2026-01-02T03:04:05.000Z"),
        price: new Prisma.Decimal("1.50"),
        id: 5n,
        missing: undefined,
        flag: true,
        nothing: null,
      })
    ).toEqual({
      error: { name: "Error", message: "boom", stack: error.stack },
      at: "2026-01-02T03:04:05.000Z",
      price: "1.5",
      id: "5",
      flag: true,
      nothing: null,
    });
  });

  it("redacts secret keys at any depth", () => {
    expect(limitContext({ headers: { Authorization: "Bearer x", accept: "json" } })).toEqual({
      headers: { Authorization: "[redacted]", accept: "json" },
    });
  });

  it("cuts long arrays", () => {
    const { items } = limitContext({ items: Array.from({ length: 52 }, (_, i) => i) }) as any;

    expect(items).toHaveLength(51);
    expect(items[50]).toBe("[2 more items]");
  });

  it("stops at the depth limit, also for circular objects", () => {
    const node: Record<string, unknown> = {};
    node.self = node;

    expect(JSON.stringify(limitContext({ node }))).toContain("[depth limit]");
  });

  it("stores oversized context as a truncated json string", () => {
    const context = limitContext({
      items: Array.from({ length: 50 }, () => "a".repeat(1_000)),
    });

    expect(Object.keys(context)).toEqual(["truncated"]);
    expect((context.truncated as string).length).toBe(16_384);
  });
});

describe("redactText", () => {
  it("hides discord webhook ids and tokens", () => {
    expect(
      redactText("POST https://discord.com/api/webhooks/123/abc-DEF_9?wait=true failed")
    ).toBe("POST https://discord.com/api/webhooks/[redacted]?wait=true failed");
  });

  it("hides credentials in connection urls", () => {
    expect(redactText("mysql://root:secret@db:3306/app")).toBe(
      "mysql://[redacted]@db:3306/app"
    );
  });

  it("keeps other text", () => {
    expect(redactText("https://www.amazon.de/dp/B0X")).toBe(
      "https://www.amazon.de/dp/B0X"
    );
  });
});

describe("isSecretKey", () => {
  it.each(["token", "DISCORD_LOGS_TOKEN", "password", "authorization", "apikey", "api_key", "clientSecret"])(
    "treats %s as secret",
    (key) => expect(isSecretKey(key)).toBe(true)
  );

  it("treats other keys as public", () => {
    expect(isSecretKey("asin")).toBe(false);
  });
});

describe("serializeError", () => {
  it("keeps the debugging fields of an error", () => {
    const error = Object.assign(new TypeError("boom"), {
      code: "P2002",
      meta: { target: "name" },
      status: 422,
    });

    expect(serializeError(error)).toEqual({
      name: "TypeError",
      message: "boom",
      stack: error.stack,
      code: "P2002",
      meta: { target: "name" },
      status: 422,
      cause: undefined,
    });
  });

  it("serializes causes up to the depth", () => {
    const error = new Error("a", { cause: new Error("b", { cause: new Error("c") }) });

    const serialized = serializeError(error, 2);

    expect((serialized.cause as any).message).toBe("b");
    expect((serialized.cause as any).cause).toBeUndefined();
  });

  it("wraps non-object values", () => {
    expect(serializeError("boom")).toEqual({ message: "boom" });
    expect(serializeError(null)).toEqual({ message: "null" });
  });
});
