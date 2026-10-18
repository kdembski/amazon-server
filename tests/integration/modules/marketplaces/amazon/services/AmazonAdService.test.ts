import { describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { ConversionErrorManager } from "@/modules/anomalies/conversion-error/ConversionErrorManager";
import { PricingErrorManager } from "@/modules/anomalies/pricing-error/PricingErrorManager";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonConversionErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorReporter";
import { AmazonPricingErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorReporter";
import { FIXED_DATE } from "../../../../../support/factories";
import {
  fakeAmazonConversionErrorDiscordService,
  fakeAmazonPricingErrorDiscordService,
} from "../../../../../support/fakes";
import { prisma } from "../../../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedCountry,
  seedMarket,
  seedPrice,
} from "../../../../../support/integration/seed";

// Real repositories and services (constructor defaults), only the Discord
// senders are faked. `undefined` positional arguments keep the defaults.
const buildAdService = () => {
  const pricing = fakeAmazonPricingErrorDiscordService();
  const conversion = fakeAmazonConversionErrorDiscordService();
  const service = new AmazonAdService(
    undefined,
    undefined,
    undefined,
    new AnomalyManager<AmazonAdSelectDto>([
      new ConversionErrorManager(
        new AmazonConversionErrorReporter(undefined, conversion.service)
      ),
      new PricingErrorManager(
        new AmazonPricingErrorReporter(undefined, pricing.service)
      ),
    ])
  );
  return { service, pricing, conversion };
};

describe("AmazonAdService (MySQL)", () => {
  describe("getForScraping", () => {
    it("returns ads flagged as matching from any category and stamps only them", async () => {
      const { service } = buildAdService();
      const inactive = await seedCategory({ active: false });
      const wanted = await seedAd({ categoryId: inactive.id, matchesRules: true });
      const other = await seedAd({ matchesRules: false });
      const unchecked = await seedAd({ matchesRules: null });

      const ads = await service.getForScraping(10);

      expect(ads).toEqual([{ id: wanted.id, asin: wanted.asin, name: wanted.name }]);
      const rows = await prisma.amazonAd.findMany({
        where: { id: { in: [wanted.id, other.id, unchecked.id] } },
        orderBy: { id: "asc" },
      });
      expect(rows.map((row) => row.scrapedAt instanceof Date)).toEqual([true, false, false]);
    });

    it("hands out the same ads again once every matching ad was stamped", async () => {
      const { service } = buildAdService();
      const first = await seedAd({ matchesRules: true });
      const second = await seedAd({ matchesRules: true });

      const round1 = await service.getForScraping(1);
      await prisma.amazonAd.update({ where: { id: round1[0].id }, data: { scrapedAt: new Date(FIXED_DATE.getTime() + 1000) } });
      const round2 = await service.getForScraping(1);
      await prisma.amazonAd.update({ where: { id: round2[0].id }, data: { scrapedAt: new Date(FIXED_DATE.getTime() + 2000) } });
      const round3 = await service.getForScraping(1);

      expect([round1[0].id, round2[0].id].sort((x, y) => x - y)).toEqual(
        [first.id, second.id].sort((x, y) => x - y)
      );
      expect(round3[0].id).toBe(round1[0].id);
    });

    it("serialises concurrent calls so they hand out disjoint ads", async () => {
      const { service } = buildAdService();
      const first = await seedAd({ matchesRules: true });
      const second = await seedAd({ matchesRules: true });

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
      const [sentListing, sentGroups] = pricing.send.mock.calls[0] as [
        AmazonAdSelectDto,
        ListingPrice[][]
      ];
      expect(sentListing.asin).toBe(ad.asin);
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
        ListingPrice[]
      ];
      expect(sentPrices.map((p) => [p.country.code, p.value.toNumber()])).toEqual([
        ["se", 40],
        ["pl", 1000],
        ["de", 1290],
      ]);
      expect(pricing.send).not.toHaveBeenCalled();
    });

    it("reports a pricing error in the market currency while the conversion check runs", async () => {
      const { service, pricing } = buildAdService();
      const ad = await seedAd();
      const pl = await seedMarket({ countryCode: "pl", currencyCode: "PLN" });
      const de = await seedMarket({ countryCode: "de", currencyCode: "EUR", rateToPln: 4.3 });
      const se = await seedMarket({ countryCode: "se", currencyCode: "SEK", rateToPln: 0.4 });
      await seedPrice({ adId: ad.id, countryId: de.country.id, value: 100, createdAt: FIXED_DATE });

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: pl.country.id, value: 500, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: de.country.id, value: 40, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: se.country.id, value: 1000, dispatchFrom: "Amazon" },
      ]);

      await vi.waitFor(() => expect(pricing.send).toHaveBeenCalledTimes(1));
      const [, sentGroups] = pricing.send.mock.calls[0] as [
        AmazonAdSelectDto,
        ListingPrice[][]
      ];
      expect(sentGroups.map((g) => g.map((p) => p.value.toNumber()))).toEqual([[40, 100]]);
    });
  });
});
