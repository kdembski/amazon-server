import { describe, expect, it, vi } from "vitest";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SystemService } from "@/shared/system/SystemService";
import { getSpacing } from "@/shared/discord/spacing";
import type { ScraperMetricSummary } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { fakeDiscordService } from "../../../../support/fakes";

const SP4 = getSpacing(4);
const RED = "<:rd:1345009441191362613>";
const YELLOW = "<:yw:1345009442579681291>";
const GREEN = "<:gn:1345009439916294154>";
const UP = "<:au:1369710756358258748>";
const DOWN = "<:ad:1369710758241374219>";
const FLAT = `${getSpacing(3)}-${getSpacing(3)}`;
const COUNTS = [0, 0, 0, 0, 0, 0, 0, 0];

const summary = (
  overrides: Partial<ScraperMetricSummary> = {}
): ScraperMetricSummary => ({
  scraper: "amazon-pdp",
  itemsPerSecond: 24.3,
  itemsPerSecondDiff: 0.12,
  pending: 210,
  requests: 1008000,
  wastedPercent: 4.2,
  captchaPercent: 1.1,
  kbPerItem: 24.5,
  reusePercent: 81.2,
  attemptsPerItem: 1.3,
  ...overrides,
});

const fieldNames = (embed: { fields: { name: string }[] }) =>
  embed.fields.map((f) => f.name);

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

    await service.sendHourly([1234, 1, 2, 3, 4, 5, 6, 7], []);

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

  it("renders a speed sum header and one line per scraper between Channels and Server", async () => {
    const { service, lastEmbed } = setup();

    await service.sendHourly(COUNTS, [
      summary(),
      summary({
        scraper: "amazon-plp",
        itemsPerSecond: 0.5,
        itemsPerSecondDiff: 0.005,
        pending: 1500,
      }),
    ]);

    expect(fieldNames(lastEmbed())).toEqual([
      "Channels",
      "Scrapers *(24.8/s)*",
      "Server",
    ]);
    expect(lastEmbed().fields[1].value).toBe(
      [
        [`${GREEN} amazon-pdp`, `**24.3/s** *(+0.12)* ${UP}`, "210"].join(SP4),
        [`${YELLOW} amazon-plp`, `**0.5/s** *(0.00)* ${FLAT}`, "1 500"].join(
          SP4
        ),
      ].join("\n")
    );
  });

  it("renders the red icon and a negative diff with the down icon", async () => {
    const { service, lastEmbed } = setup();

    await service.sendHourly(COUNTS, [
      summary({ itemsPerSecond: 0.08, itemsPerSecondDiff: -0.05 }),
    ]);

    expect(lastEmbed().fields[1].value.split("\n")[0]).toBe(
      [`${RED} amazon-pdp`, `**0.1/s** *(-0.05)* ${DOWN}`, "210"].join(SP4)
    );
  });

  it("renders - for missing pending", async () => {
    const { service, lastEmbed } = setup();

    await service.sendHourly(COUNTS, [summary({ pending: null })]);

    expect(lastEmbed().fields[1].value.endsWith(`${SP4}-`)).toBe(true);
  });

  it("omits the Scrapers field without summaries", async () => {
    const { service, lastEmbed } = setup();

    await service.sendHourly(COUNTS, []);

    expect(fieldNames(lastEmbed())).toEqual(["Channels", "Server"]);
  });

  it("truncates the Scrapers field to 1023 characters", async () => {
    const { service, lastEmbed } = setup();

    await service.sendHourly(COUNTS, [summary({ scraper: "x".repeat(1100) })]);

    expect(lastEmbed().fields[1].value).toHaveLength(1023);
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
