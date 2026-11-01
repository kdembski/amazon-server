import { describe, expect, it } from "vitest";
import { createSettingsModule } from "@/modules/settings";

describe("createSettingsModule", () => {
  it("mounts the settings and Discord channel routers without crons", () => {
    const module = createSettingsModule();

    expect(module.routers!.map((router) => router.path)).toEqual(["/settings", "/discord-channels"]);
    expect(module.crons).toBeUndefined();
    expect(module.workerCrons).toBeUndefined();
  });
});
