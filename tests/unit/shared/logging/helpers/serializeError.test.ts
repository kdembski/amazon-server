import { describe, expect, it } from "vitest";
import { serializeError } from "@/shared/logging/helpers/serializeError";

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
