import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { limitContext, limitText } from "@/shared/logging/helpers/limitContext";

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
