import { describe, expect, it } from "vitest";
import { StatusReportFormatter } from "@/modules/monitoring/services/StatusReportFormatter";
import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";

const SP4 = DiscordFormatter.spacing(4);
const formatter = new StatusReportFormatter();

describe("StatusReportFormatter", () => {
  it("getHourlyEmbed lists the channels, the server and the scraped counts", () => {
    const embed = formatter.getHourlyEmbed(
      { scraped: 1234, comparable: 56, minPrices: 3, channels: [{ name: "a", count: 2 }] },
      [],
      { cpu: 12.34, ram: 56 }
    );

    expect(embed).toEqual({
      title: "Hourly status",
      description: `Scraped: **1 234**${SP4}3+ prices: **56**`,
      fields: [
        { name: "Channels", value: "a: **2**" },
        { name: "Server", value: `CPU: **12.3%**${SP4}RAM: **56%**` },
      ],
    });
  });

  it("getDailyEmbed adds the disk space after the sections and leaves out the min prices count without the setting", () => {
    const section = { name: "Section", value: "x" };

    expect(
      formatter.getDailyEmbed([section], 7, undefined, undefined, { used: "1", total: "2", percentage: "50" })
    ).toEqual({
      title: "Daily status",
      description: "Scraped: **7**",
      fields: [section, { name: "Server", value: "Disk space: **1**/**2** *(50%)*" }],
    });
  });
});
