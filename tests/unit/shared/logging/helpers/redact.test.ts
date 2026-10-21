import { describe, expect, it } from "vitest";
import { isSecretKey, redactText } from "@/shared/logging/helpers/redact";

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
