import { describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdConversionErrorPercentageManager } from "@/managers/conversion-error/AmazonAdConversionErrorPercentageManager";
import { AmazonAdConversionErrorRangeManager } from "@/managers/conversion-error/AmazonAdConversionErrorRangeManager";
import { AmazonAdPricingErrorManager } from "@/managers/AmazonAdPricingErrorManager";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { FIXED_DATE } from "../../../support/factories";
import {
  fakeDiscordConversionErrorService,
  fakeDiscordPricingErrorService,
} from "../../../support/fakes";
import { prisma } from "../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedCountry,
  seedSearchRule,
  seedMarket,
  seedPrice,
} from "../../../support/integration/seed";

// Real repositories and services (constructor defaults), only the Discord
// senders are faked. `undefined` positional arguments keep the defaults.
const buildAdService = () => {
  const pricing = fakeDiscordPricingErrorService();
  const conversion = fakeDiscordConversionErrorService();
  const service = new AmazonAdService(
    undefined,
    undefined,
    undefined,
    undefined,
    new AmazonAdConversionErrorManager(
      new AmazonAdConversionErrorPercentageManager(undefined, undefined, conversion.service),
      new AmazonAdConversionErrorRangeManager(undefined, undefined, conversion.service)
    ),
    new AmazonAdPricingErrorManager(pricing.service)
  );
  return { service, pricing, conversion };
};

describe("AmazonAdService (MySQL)", () => {
  describe("getForScraping", () => {
    it("returns search rule matches from any category and stamps only them", async () => {
      const { service } = buildAdService();
      const inactive = await seedCategory({ active: false });
      const wanted = await seedAd({ categoryId: inactive.id, name: "Sony WH-1000XM5" });
      const other = await seedAd({ name: "Bose QC45" });
      await seedSearchRule({ value: "sony" });

      const ads = await service.getForScraping(10);

      expect(ads).toEqual([{ id: wanted.id, asin: wanted.asin, name: wanted.name }]);
      const row = await prisma.amazonAd.findUniqueOrThrow({ where: { id: wanted.id } });
      expect(row.scrapedAt).toBeInstanceOf(Date);
      const skipped = await prisma.amazonAd.findUniqueOrThrow({ where: { id: other.id } });
      expect(skipped.scrapedAt).toBeNull();
    });

    it("returns an empty list and stamps nothing when there are no search rules", async () => {
      const { service } = buildAdService();
      const ad = await seedAd();

      await expect(service.getForScraping(10)).resolves.toEqual([]);
      const row = await prisma.amazonAd.findUniqueOrThrow({ where: { id: ad.id } });
      expect(row.scrapedAt).toBeNull();
    });

    it("serialises concurrent calls so they hand out disjoint ads", async () => {
      const { service } = buildAdService();
      const first = await seedAd({ name: "Sony A" });
      const second = await seedAd({ name: "Sony B" });
      await seedSearchRule({ value: "sony" });

      // The second caller waits 1 s on the static lock before retrying.
      const [a, b] = await Promise.all([
        service.getForScraping(1),
        service.getForScraping(1),
      ]);

      expect([a[0].id, b[0].id].sort((x, y) => x - y)).toEqual(
        [first.id, second.id].sort((x, y) => x - y)
      );
    });
  });

  describe("updatePrices", () => {
    it("stores prices, logs ad_scraped and reports a halved price as a pricing error", async () => {
      const { service, pricing } = buildAdService();
      const ad = await seedAd();
      const country = await seedCountry({ active: true });
      await seedPrice({ adId: ad.id, countryId: country.id, value: 100, createdAt: FIXED_DATE });

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: country.id, value: 40, dispatchFrom: "Amazon" },
      ]);

      expect(await prisma.amazonAdPrice.count({ where: { adId: ad.id } })).toBe(2);
      expect(await prisma.log.count({ where: { event: "ad_scraped" } })).toBe(1);
      // The anomaly managers run after updatePrices resolves.
      await vi.waitFor(() => expect(pricing.send).toHaveBeenCalledTimes(1));
      expect(await prisma.log.count({ where: { event: "pricing_error_sent" } })).toBe(1);
      const [sentAd, sentGroups] = pricing.send.mock.calls[0] as [
        AmazonAdSelectDto,
        AmazonAdPriceSelectDto[][]
      ];
      expect(sentAd.id).toBe(ad.id);
      expect(sentGroups.map((g) => g.map((p) => p.value.toNumber()))).toEqual([[40, 100]]);
    });

    it("reports a conversion error when the cheapest market is under 10 % of the next one", async () => {
      const { service, conversion, pricing } = buildAdService();
      const ad = await seedAd();
      const pl = await seedMarket({ countryCode: "pl", currencyCode: "PLN" });
      const de = await seedMarket({ countryCode: "de", currencyCode: "EUR", rateToPln: 4.3 });
      const se = await seedMarket({ countryCode: "se", currencyCode: "SEK", rateToPln: 0.4 });

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: pl.country.id, value: 1000, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: de.country.id, value: 300, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: se.country.id, value: 100, dispatchFrom: "Amazon" },
      ]);

      // 40 PLN (se) vs 1000 PLN (pl): channel 3 (90 %) and channel 4 (0-50 PLN).
      await vi.waitFor(() => expect(conversion.send).toHaveBeenCalledTimes(2));
      expect(conversion.setChannel.mock.calls.map((c) => c[0]).sort()).toEqual(["3", "4"]);
      const events = await prisma.log.findMany({
        where: { event: { startsWith: "conversion_error" } },
      });
      expect(events.map((e) => e.event).sort()).toEqual([
        "conversion_error_3_sent",
        "conversion_error_4_sent",
      ]);
      const [, sentPrices] = conversion.send.mock.calls[0] as [
        AmazonAdSelectDto,
        AmazonAdPriceSelectDto[]
      ];
      expect(sentPrices.map((p) => [p.country.code, p.value.toNumber()])).toEqual([
        ["se", 40],
        ["pl", 1000],
        ["de", 1290],
      ]);
      expect(pricing.send).not.toHaveBeenCalled();
    });
  });
});
