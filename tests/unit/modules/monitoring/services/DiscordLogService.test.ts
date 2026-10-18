import { describe, expect, it, vi } from "vitest";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SystemService } from "@/shared/system/SystemService";
import { getSpacing } from "@/shared/discord/spacing";
import { fakeDiscordService } from "../../../../support/fakes";

const SP4 = getSpacing(4);

const setup = () => {
  const discord = fakeDiscordService();
  const getDiskSpace = vi
    .fn()
    .mockResolvedValue({ used: 10, total: 100, percentage: 10 });
  const system = {
    getCpuUsage: () => 12.34,
    getMemoryUsage: async () => 56,
    getDiskSpace,
  } as unknown as SystemService;
  const service = new DiscordLogService(discord.service, system);
  const lastEmbed = () => discord.send.mock.calls.at(-1)![0].embeds[0];
  return { service, discord, getDiskSpace, lastEmbed };
};

describe("DiscordLogService.send", () => {
  it("forwards to the underlying webhook", () => {
    const { service, discord } = setup();
    service.send("text");
    expect(discord.send).toHaveBeenCalledWith("text");
  });
});

describe("DiscordLogService.sendHourly", () => {
  it("renders channel counts and server stats", async () => {
    const { service, lastEmbed } = setup();

    await service.sendHourly([1234, 1, 2, 3, 4, 5, 6, 7]);

    expect(lastEmbed()).toEqual({
      title: "Hourly status",
      description: "Scraped: **1 234**",
      fields: [
        {
          name: "Channels",
          value: [
            "50%: **1**",
            "70%: **2**",
            "90%: **3**",
            "0-50: **4**",
            "50-200: **5**",
            "200+: **6**",
            "hist: **7**",
          ].join(SP4),
        },
        { name: "Server", value: ["CPU: **12.3%**", "RAM: **56%**"].join(SP4) },
      ],
    });
  });
});

describe("DiscordLogService.sendDaily", () => {
  const sectionFields = [
    { name: "Collected asins", value: "a" },
    { name: "Exchange rates", value: "b" },
  ];

  it("renders section fields in order followed by disk usage", async () => {
    const { service, lastEmbed } = setup();

    await service.sendDaily(sectionFields, 890);

    expect(lastEmbed()).toEqual({
      title: "Daily status",
      description: "Scraped: **890**",
      fields: [
        ...sectionFields,
        { name: "Server", value: "Disk space: **10**/**100** *(10%)*" },
      ],
    });
  });

  it("omits the server field when disk info is unavailable", async () => {
    const { service, getDiskSpace, lastEmbed } = setup();
    getDiskSpace.mockResolvedValue(undefined);

    await service.sendDaily(sectionFields, 0);

    expect(lastEmbed().fields).toEqual(sectionFields);
  });
});
