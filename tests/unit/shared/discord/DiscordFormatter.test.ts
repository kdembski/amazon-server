import { describe, expect, it } from "vitest";
import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";

describe("DiscordFormatter.spacing", () => {
  it("joins N left-to-right marks with spaces", () => {
    expect(DiscordFormatter.spacing(3)).toBe("\u200E \u200E \u200E");
  });

  it("returns empty string for 0", () => {
    expect(DiscordFormatter.spacing(0)).toBe("");
  });
});
