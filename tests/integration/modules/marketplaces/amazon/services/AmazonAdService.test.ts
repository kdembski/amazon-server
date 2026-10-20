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
      const wanted = await seedAd({ categoryId: inactive.id, excluded: true });
      const other = await seedAd({ excluded: false });
      const unchecked = await seedAd({ excluded: null });

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
      const first = await seedAd({ excluded: true });
      const second = await seedAd({ excluded: true });

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
      const first = await seedAd({ excluded: true });
      const second = await seedAd({ excluded: true });

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
      await seedPrice({ adId: ad.id, countryId: country.id, value: 100, createdAt: new Date(Date.now() - 3_600_000) });

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: country.id, value: 40, dispatchFrom: "Amazon" },
      ]);

      expect(await prisma.amazonAdPrice.count({ where: { adId: ad.id } })).toBe(2);
      const scraped = await prisma.activityEvent.findMany({ where: { type: "ad_scraped" } });
      expect(scraped).toEqual([
        expect.objectContaining({ marketplace: "amazon", data: { asin: ad.asin } }),
      ]);
      // The anomaly managers run after updatePrices resolves.
      await vi.waitFor(() => expect(pricing.send).toHaveBeenCalledTimes(1));
      const pricingErrors = await prisma.activityEvent.findMany({
        where: { type: "pricing_error_sent" },
      });
      expect(pricingErrors).toHaveLength(1);
      expect(pricingErrors[0].data).toMatchObject({ asin: ad.asin });
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
      const events = await prisma.activityEvent.findMany({
        where: { type: "conversion_error_sent" },
      });
      const channels = events.map((e) => (e.data as { channel: string }).channel);
      expect(channels.sort()).toEqual(["3", "4"]);
      expect(events[0].data).toMatchObject({
        asin: ad.asin,
        prices: [
          { country: "se", value: "40" },
          { country: "pl", value: "1000" },
          { country: "de", value: "1290" },
        ],
      });
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

    it("compares with recent prices of countries missing from the scrape", async () => {
      const { service, conversion } = buildAdService();
      const ad = await seedAd();
      const pl = await seedMarket({ countryCode: "pl", currencyCode: "PLN" });
      const de = await seedMarket({ countryCode: "de", currencyCode: "EUR", rateToPln: 4.3 });
      const fr = await seedMarket({ countryCode: "fr", currencyCode: "NOK", rateToPln: 0.4 });
      const italy = await seedMarket({ countryCode: "it", currencyCode: "DKK", rateToPln: 0.6 });
      const se = await seedMarket({ countryCode: "se", currencyCode: "SEK", rateToPln: 0.4 });
      const ch = await seedMarket({ countryCode: "ch", currencyCode: "CHF", rateToPln: 4.3 });
      for (const [country, value] of [[de, 10], [fr, 125], [italy, 100]] as const) {
        await seedPrice({ adId: ad.id, countryId: country.country.id, value, createdAt: new Date() });
      }

      // 40 PLN (se) is over 90 % below the median of pl and ch (1145 PLN), but de, fr and it
      // (43, 50 and 60 PLN) bring the median of the other prices down to 60 PLN.
      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: pl.country.id, value: 1000, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: se.country.id, value: 100, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: ch.country.id, value: 300, dispatchFrom: "Amazon" },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(conversion.send).not.toHaveBeenCalled();
    });

    it("reports a pricing error in the market currency while the conversion check runs", async () => {
      const { service, pricing } = buildAdService();
      const ad = await seedAd();
      const pl = await seedMarket({ countryCode: "pl", currencyCode: "PLN" });
      const de = await seedMarket({ countryCode: "de", currencyCode: "EUR", rateToPln: 4.3 });
      const se = await seedMarket({ countryCode: "se", currencyCode: "SEK", rateToPln: 0.4 });
      await seedPrice({ adId: ad.id, countryId: de.country.id, value: 100, createdAt: new Date(Date.now() - 3_600_000) });

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
