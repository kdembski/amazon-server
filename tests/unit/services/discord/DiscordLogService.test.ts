import { describe, expect, it, vi } from "vitest";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { ScraperStatusService } from "@/services/ScraperStatusService";
import { SystemService } from "@/services/SystemService";
import { getSpacing } from "@/helpers/discord";
import { buildRate } from "../../../support/factories";
import { fakeDiscordService } from "../../../support/fakes";

const SP4 = getSpacing(4);
const RED = "<:rd:1345009441191362613>";
const YELLOW = "<:yw:1345009442579681291>";
const GREEN = "<:gn:1345009439916294154>";
const UP = "<:au:1369710756358258748>";
const DOWN = "<:ad:1369710758241374219>";
const FLAT = `${getSpacing(3)}-${getSpacing(3)}`;

type Status = { speed: number; pending: number; speedDiff: number };

const setup = (statuses: Record<string, Status> = {}) => {
  const discord = fakeDiscordService();
  const scrapers = { statuses } as unknown as ScraperStatusService;
  const getDiskSpace = vi
    .fn()
    .mockResolvedValue({ used: 10, total: 100, percentage: 10 });
  const system = {
    getCpuUsage: () => 12.34,
    getMemoryUsage: async () => 56,
    getDiskSpace,
  } as unknown as SystemService;
  const service = new DiscordLogService(discord.service, scrapers, system);
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
  it("renders channel counts and server stats without scrapers", async () => {
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

  it("renders scrapers sorted by name with speed icons and diffs", async () => {
    const { service, lastEmbed } = setup({
      b: { speed: 0.08, pending: 1500, speedDiff: 0.03 },
      a: { speed: 0.5, pending: 2, speedDiff: 0.005 },
      c: { speed: 2, pending: 0, speedDiff: -0.05 },
    });

    await service.sendHourly([0, 0, 0, 0, 0, 0, 0, 0]);

    const scrapers = lastEmbed().fields[1];
    expect(scrapers.name).toBe("Scrapers *(2.6/s)*");
    expect(scrapers.value).toBe(
      [
        [`${YELLOW} a`, `**0.5/s** *(0.00)* ${FLAT}`, "2"].join(SP4),
        [`${RED} b`, `**0.1/s** *(+0.03)* ${UP}`, "1 500"].join(SP4),
        [`${GREEN} c`, `**2.0/s** *(-0.05)* ${DOWN}`, "0"].join(SP4),
      ].join("\n")
    );
  });

  it("truncates the scrapers field to 1023 characters", async () => {
    const { service, lastEmbed } = setup({
      ["x".repeat(1100)]: { speed: 1, pending: 1, speedDiff: 0 },
    });

    await service.sendHourly([0, 0, 0, 0, 0, 0, 0, 0]);

    expect(lastEmbed().fields[1].value).toHaveLength(1023);
  });
});

describe("DiscordLogService.sendDaily", () => {
  it("renders asin counts, exchange rates and disk usage", async () => {
    const { service, lastEmbed } = setup();
    const rate = buildRate({ value: 4.3 });

    await service.sendDaily({ total: 12345, today: 67 }, [rate], 890);

    expect(lastEmbed()).toEqual({
      title: "Daily status",
      description: "Scraped: **890**",
      fields: [
        {
          name: "Collected asins",
          value: ["Total: **12 345**", "Last 24h: **67**"].join(SP4),
        },
        { name: "Exchange rates", value: "EUR -> PLN: **4.3**" },
        { name: "Server", value: "Disk space: **10**/**100** *(10%)*" },
      ],
    });
  });

  it("omits the server field when disk info is unavailable", async () => {
    const { service, getDiskSpace, lastEmbed } = setup();
    getDiskSpace.mockResolvedValue(undefined);

    await service.sendDaily({ total: 0, today: 0 }, [], 0);

    expect(lastEmbed().fields.map((f: { name: string }) => f.name)).toEqual([
      "Collected asins",
      "Exchange rates",
    ]);
  });
});
