import { describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonCountryOutlierReporter } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierReporter";
import { AmazonPriceDropReporter } from "@/modules/marketplaces/amazon/services/AmazonPriceDropReporter";
import { ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";
import { FIXED_DATE } from "../../../../../support/factories";
import {
  fakeAmazonCountryOutlierDiscordService,
  fakeAmazonPriceDropDiscordService,
} from "../../../../../support/fakes";
import { prisma } from "../../../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedAmazonCountry,
  seedMarket,
  seedPrice,
} from "../../../../../support/integration/seed";

// Real repositories and services (constructor defaults), only the Discord
// senders are faked. `undefined` positional arguments keep the defaults.
const buildAdService = () => {
  const pricing = fakeAmazonPriceDropDiscordService();
  const conversion = fakeAmazonCountryOutlierDiscordService();
  const service = new AmazonAdService(
    undefined,
    undefined,
    undefined,
    new AnomalyManager<AmazonAdSelectDto>([
      new CountryOutlierManager(
        new AmazonCountryOutlierReporter(undefined, conversion.service)
      ),
      new PriceDropManager(
        new AmazonPriceDropReporter(undefined, pricing.service)
      ),
    ])
  );
  return { service, pricing, conversion };
};

describe("AmazonAdService (MySQL)", () => {
  describe("getForScraping", () => {
    it("returns ads that are not excluded from any category and stamps only them", async () => {
      const { service } = buildAdService();
      const inactive = await seedCategory({ active: false });
      const wanted = await seedAd({ categoryId: inactive.id, excluded: false });
      const other = await seedAd({ excluded: true });
      const unchecked = await seedAd({ excluded: null });

      const ads = await service.getForScraping(10);

      expect(ads).toEqual([{ id: wanted.id, asin: wanted.asin, name: wanted.name }]);
      const rows = await prisma.amazonAd.findMany({
        where: { id: { in: [wanted.id, other.id, unchecked.id] } },
        orderBy: { id: "asc" },
      });
      expect(rows.map((row) => row.scrapedAt instanceof Date)).toEqual([true, false, false]);
    });

    it("hands out the same ads again once every included ad was stamped", async () => {
      const { service } = buildAdService();
      const first = await seedAd({ excluded: false });
      const second = await seedAd({ excluded: false });

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
      const first = await seedAd({ excluded: false });
      const second = await seedAd({ excluded: false });

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
    it("stores prices, counts ad_scraped and reports a halved price as a price drop", async () => {
      const { service, pricing } = buildAdService();
      const ad = await seedAd();
      const { countryId } = await seedAmazonCountry();
      await seedPrice({ adId: ad.id, countryId, value: 100, createdAt: new Date(Date.now() - 3_600_000) });

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId, value: 40, dispatchFrom: "Amazon" },
      ]);

      expect(await prisma.amazonAdPrice.count({ where: { adId: ad.id } })).toBe(2);
      expect(ActivityCounter.getInstance().counts.get("ad_scraped:amazon")?.count).toBe(1);
      // The anomaly managers run after updatePrices resolves.
      await vi.waitFor(() => expect(pricing.send).toHaveBeenCalledTimes(1));
      const priceDrops = await prisma.businessLog.findMany({
        where: { type: "price_drop_sent" },
      });
      expect(priceDrops).toHaveLength(1);
      expect(priceDrops[0].data).toMatchObject({ asin: ad.asin });
      const [sentListing, sentGroups] = pricing.send.mock.calls[0] as [
        AmazonAdSelectDto,
        ListingPrice[][]
      ];
      expect(sentListing.asin).toBe(ad.asin);
      expect(sentGroups.map((g) => g.map((p) => p.value.toNumber()))).toEqual([[40, 100]]);
    });

    it("stores the valid prices and counts ad_scraped when one price of the batch is invalid", async () => {
      const { service } = buildAdService();
      const ad = await seedAd();
      const { countryId } = await seedAmazonCountry();

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId, value: 40, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: 999, value: 50, dispatchFrom: "Amazon" },
      ]);

      const prices = await prisma.amazonAdPrice.findMany({ where: { adId: ad.id } });
      expect(prices.map((p) => [p.countryId, p.value.toNumber()])).toEqual([[countryId, 40]]);
      expect(ActivityCounter.getInstance().counts.get("ad_scraped:amazon")?.count).toBe(1);
      await vi.waitFor(async () =>
        expect(
          await prisma.systemLog.count({
            where: { message: "Batch insert of 2 prices failed, 1 of them were not stored one by one" },
          })
        ).toBe(1)
      );
    });

    it("reports a country outlier when the cheapest market is under 10 % of the next one", async () => {
      const { service, conversion, pricing } = buildAdService();
      const ad = await seedAd();
      const pl = await seedMarket({ countryCode: "pl", currencyCode: "PLN" });
      const de = await seedMarket({ countryCode: "de", currencyCode: "EUR", rateToPln: 4.3 });
      const se = await seedMarket({ countryCode: "se", currencyCode: "SEK", rateToPln: 0.4 });
      const gb = await seedMarket({ countryCode: "gb", currencyCode: "GBP", rateToPln: 5 });

      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: pl.country.id, value: 1000, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: de.country.id, value: 300, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: se.country.id, value: 100, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: gb.country.id, value: 400, dispatchFrom: "Amazon" },
      ]);

      // 40 PLN (se) vs the median 1290 PLN (de): channel 3 (90 %) and channel 4 (0-50 PLN).
      await vi.waitFor(() => expect(conversion.send).toHaveBeenCalledTimes(2));
      expect(conversion.send.mock.calls.map((c) => c[0]).sort()).toEqual([3, 4]);
      const events = await prisma.businessLog.findMany({
        where: { type: "country_outlier_sent" },
      });
      const channels = events.map((e) => (e.data as { channel: string }).channel);
      expect(channels.sort()).toEqual(["3", "4"]);
      expect(events[0].data).toMatchObject({
        asin: ad.asin,
        prices: [
          { country: "se", value: "40" },
          { country: "pl", value: "1000" },
          { country: "de", value: "1290" },
          { country: "gb", value: "2000" },
        ],
      });
      const [, , sentPrices] = conversion.send.mock.calls[0] as [
        number,
        AmazonAdSelectDto,
        ListingPrice[]
      ];
      expect(sentPrices.map((p) => [p.country.code, p.value.toNumber()])).toEqual([
        ["se", 40],
        ["pl", 1000],
        ["de", 1290],
        ["gb", 2000],
      ]);
      expect(pricing.send).not.toHaveBeenCalled();
    });

    it("reports an outlier once while only the other countries change", async () => {
      const { service, conversion } = buildAdService();
      const ad = await seedAd();
      const pl = await seedMarket({ countryCode: "pl", currencyCode: "PLN" });
      const de = await seedMarket({ countryCode: "de", currencyCode: "EUR", rateToPln: 4.3 });
      const se = await seedMarket({ countryCode: "se", currencyCode: "SEK", rateToPln: 0.4 });
      const gb = await seedMarket({ countryCode: "gb", currencyCode: "GBP", rateToPln: 5 });
      const price = (market: typeof pl, value: number) => {
        return { adId: ad.id, countryId: market.country.id, value, dispatchFrom: "Amazon" };
      };
      const reported = () => {
        return prisma.amazonCountryOutlierChannelReport.findMany({ orderBy: { channelId: "asc" } });
      };

      // Two countries: no check. The third country makes 20 PLN (pl) an outlier at an unchanged price.
      await service.updatePrices(ad.id, [price(pl, 20), price(de, 30)]);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await service.updatePrices(ad.id, [price(pl, 20), price(de, 30), price(se, 300)]);
      await vi.waitFor(async () => expect(await reported()).toHaveLength(2));
      await service.updatePrices(ad.id, [price(pl, 20), price(de, 35), price(se, 300), price(gb, 60)]);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 20 PLN vs the median 120 PLN: channels 2 and 4, sent once each.
      expect(conversion.send.mock.calls.map((c) => c[0]).sort()).toEqual([2, 4]);
      const rows = await reported();
      expect(rows.map((row) => [row.channelId, row.countryId, row.value.toNumber()])).toEqual([
        [2, pl.country.id, 20],
        [4, pl.country.id, 20],
      ]);
    });

    it("ignores recent prices of countries missing from the scrape", async () => {
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

      // 40 PLN (se) is 96 % below the weighted median of pl and ch (1000 PLN); de, fr and it
      // (43, 50 and 60 PLN) would bring it under 50 % if they were compared.
      await service.updatePrices(ad.id, [
        { adId: ad.id, countryId: pl.country.id, value: 1000, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: se.country.id, value: 100, dispatchFrom: "Amazon" },
        { adId: ad.id, countryId: ch.country.id, value: 300, dispatchFrom: "Amazon" },
      ]);

      await vi.waitFor(() => expect(conversion.send).toHaveBeenCalledTimes(2));
      const [, , sentPrices] = conversion.send.mock.calls[0] as [number, AmazonAdSelectDto, ListingPrice[]];
      expect(sentPrices.map((p) => p.country.code)).toEqual(["se", "pl", "ch"]);
    });

    it("reports a price drop in the market currency while the conversion check runs", async () => {
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

  describe("createMany", () => {
    const dto = (asin: string, categoryName: string) => ({
      asin,
      name: `Ad ${asin}`,
      image: `${asin}.jpg`,
      categoryName,
    });

    it("inserts new ads and skips ASINs already stored", async () => {
      const { service } = buildAdService();
      const old = await seedAd({ asin: "B0OLD00001", name: "Old name" });
      const category = await prisma.amazonAdCategory.findUniqueOrThrow({
        where: { id: old.categoryId },
      });

      const result = await service.createMany([
        dto("B0OLD00001", category.name),
        dto("B0NEW00001", category.name),
      ]);

      expect(result).toEqual({ count: 1 });
      const rows = await prisma.amazonAd.findMany({ orderBy: { asin: "asc" } });
      expect(rows.map((r) => [r.asin, r.name, r.excluded, r.categoryId])).toEqual([
        ["B0NEW00001", "Ad B0NEW00001", null, category.id],
        ["B0OLD00001", "Old name", old.excluded, category.id],
      ]);
    });

    it("creates a missing category once and reuses an existing one", async () => {
      const { service } = buildAdService();
      const existing = await seedCategory({ name: "audio" });

      await service.createMany([
        dto("B0CAT00001", "new-cat"),
        dto("B0CAT00002", "new-cat"),
        dto("B0CAT00003", "audio"),
      ]);

      const created = await prisma.amazonAdCategory.findMany({ where: { name: "new-cat" } });
      expect(created).toHaveLength(1);
      const rows = await prisma.amazonAd.findMany({ orderBy: { asin: "asc" } });
      expect(rows.map((r) => r.categoryId)).toEqual([
        created[0].id,
        created[0].id,
        existing.id,
      ]);
    });
  });

  describe("applyBatch", () => {
    it("stores the prices of every ad and counts ad_scraped per ad", async () => {
      const { service } = buildAdService();
      const first = await seedAd();
      const second = await seedAd();
      const de = await seedAmazonCountry();
      const fr = await seedAmazonCountry();

      const result = await service.applyBatch({
        prices: [first, second].map((ad) => ({
          id: ad.id,
          prices: [de, fr].map(({ countryId }) => ({
            adId: ad.id,
            countryId,
            value: 40,
            dispatchFrom: "Amazon",
          })),
        })),
        deleted: [],
      });

      expect(result).toEqual({ prices: 2, deleted: 0 });
      expect(await prisma.amazonAdPrice.count({ where: { adId: first.id } })).toBe(2);
      expect(await prisma.amazonAdPrice.count({ where: { adId: second.id } })).toBe(2);
      expect(ActivityCounter.getInstance().counts.get("ad_scraped:amazon")?.count).toBe(2);
    });

    it("stores the valid prices of every ad when one price is invalid", async () => {
      const { service } = buildAdService();
      const broken = await seedAd();
      const valid = await seedAd();
      const { countryId } = await seedAmazonCountry();

      await service.applyBatch({
        prices: [
          {
            id: broken.id,
            prices: [
              { adId: broken.id, countryId, value: 40, dispatchFrom: "Amazon" },
              { adId: broken.id, countryId: 999, value: 50, dispatchFrom: "Amazon" },
            ],
          },
          {
            id: valid.id,
            prices: [{ adId: valid.id, countryId, value: 30, dispatchFrom: "Amazon" }],
          },
        ],
        deleted: [],
      });

      const prices = await prisma.amazonAdPrice.findMany({ orderBy: { adId: "asc" } });
      expect(prices.map((p) => [p.adId, p.value.toNumber()])).toEqual([
        [broken.id, 40],
        [valid.id, 30],
      ]);
    });

    it("deletes ads with their prices and ignores missing ids", async () => {
      const { service } = buildAdService();
      const gone = await seedAd();
      const kept = await seedAd();
      await seedPrice({ adId: gone.id });

      const result = await service.applyBatch({ prices: [], deleted: [gone.id, 999999] });

      expect(result).toEqual({ prices: 0, deleted: 1 });
      expect(await prisma.amazonAd.findMany({ select: { id: true } })).toEqual([{ id: kept.id }]);
      expect(await prisma.amazonAdPrice.count()).toBe(0);
    });

    it("accepts empty lists", async () => {
      const { service } = buildAdService();

      expect(await service.applyBatch({ prices: [], deleted: [] })).toEqual({
        prices: 0,
        deleted: 0,
      });
    });

    it("runs the anomaly check per ad", async () => {
      const { service, pricing } = buildAdService();
      const dropped = await seedAd();
      const steady = await seedAd();
      const { countryId } = await seedAmazonCountry();
      const hourAgo = new Date(Date.now() - 3_600_000);
      await seedPrice({ adId: dropped.id, countryId, value: 100, createdAt: hourAgo });
      await seedPrice({ adId: steady.id, countryId, value: 100, createdAt: hourAgo });

      await service.applyBatch({
        prices: [
          { id: dropped.id, prices: [{ adId: dropped.id, countryId, value: 40, dispatchFrom: "Amazon" }] },
          { id: steady.id, prices: [{ adId: steady.id, countryId, value: 100, dispatchFrom: "Amazon" }] },
        ],
        deleted: [],
      });

      await vi.waitFor(() => expect(pricing.send).toHaveBeenCalledTimes(1));
      expect((pricing.send.mock.calls[0][0] as AmazonAdSelectDto).asin).toBe(dropped.asin);
    });
  });
});
