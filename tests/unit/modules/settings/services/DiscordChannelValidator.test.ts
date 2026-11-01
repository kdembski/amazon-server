import { describe, expect, it } from "vitest";
import { DiscordChannelValidator } from "@/modules/settings/services/DiscordChannelValidator";

const validator = new DiscordChannelValidator();

const expectInvalid = (fn: () => unknown, message: string) => {
  expect(fn).toThrow(message);
  try {
    fn();
  } catch (error: any) {
    expect(error.status).toBe(400);
  }
};

describe("DiscordChannelValidator", () => {
  it("validateCreate trims the name and the token", () => {
    expect(validator.validateCreate({ name: " outlier-90 ", token: " 123/ab_C-d " })).toEqual({
      name: "outlier-90",
      token: "123/ab_C-d",
    });
  });

  it("validateUpdate keeps missing fields undefined", () => {
    expect(validator.validateUpdate({ name: "outlier-50" })).toEqual({
      name: "outlier-50",
      token: undefined,
    });
    expect(validator.validateUpdate({ token: "1/a" })).toEqual({ name: undefined, token: "1/a" });
  });

  it.each([null, [], "x"])("rejects the body %s", (body) => {
    expectInvalid(() => validator.validateCreate(body), "Discord channel must be an object");
  });

  it.each([undefined, " ", "n".repeat(64), 5])("rejects the name %s", (name) => {
    expectInvalid(
      () => validator.validateCreate({ name, token: "1/a" }),
      "Discord channel name must be a string of 1 to 63 characters"
    );
  });

  it.each([undefined, "abc", "https://discord.com/api/webhooks/1/a", "1/a b"])(
    "rejects the token %s",
    (token) => {
      expectInvalid(
        () => validator.validateCreate({ name: "n", token }),
        "Discord channel token must be the webhook URL part <id>/<token>"
      );
    }
  );
});
