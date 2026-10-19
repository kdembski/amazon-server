import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";
import { ActivityEventCreateMapper } from "@/modules/monitoring/mappers/ActivityEventCreateMapper";
import { AmazonAdCategoryCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCategoryCreateMapper";
import { AmazonAdCategoryUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCategoryUpdateMapper";
import { AmazonSearchRuleBatchMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleBatchMapper";
import { AmazonSearchRuleCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleCreateMapper";
import { AmazonSearchRuleUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleUpdateMapper";
import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdUpdateMapper";
import { AmazonAdPriceCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceCreateMapper";
import { AmazonAdPriceUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceUpdateMapper";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { CountryCreateMapper } from "@/modules/currency/mappers/CountryCreateMapper";
import { CountryUpdateMapper } from "@/modules/currency/mappers/CountryUpdateMapper";
import { CurrencyCreateMapper } from "@/modules/currency/mappers/CurrencyCreateMapper";
import { CurrencyUpdateMapper } from "@/modules/currency/mappers/CurrencyUpdateMapper";
import { CurrencyExchangeRateCreateMapper } from "@/modules/currency/mappers/CurrencyExchangeRateCreateMapper";
import { CurrencyExchangeRateUpdateMapper } from "@/modules/currency/mappers/CurrencyExchangeRateUpdateMapper";
import {
  buildAd,
  buildCurrency,
  buildPrice,
  buildPriceCountry,
} from "../../support/factories";

const NOW = new Date("2026-03-04T05:06:07.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("create mappers", () => {
  it.each([
    {
      name: "ActivityEventCreateMapper",
      map: (dto: any) => new ActivityEventCreateMapper().toCreateInput(dto),
      dto: { type: "ad_scraped", marketplace: "amazon", data: { asin: "B0X" } },
      expected: {
        type: "ad_scraped",
        marketplace: "amazon",
        data: { asin: "B0X" },
        createdAt: NOW,
      },
    },
    {
      name: "AmazonAdCategoryCreateMapper",
      map: (dto: any) => new AmazonAdCategoryCreateMapper().toCreateInput(dto),
      dto: { name: "tools" },
      expected: { name: "tools", createdAt: NOW, updatedAt: NOW },
    },
    {
      name: "AmazonSearchRuleCreateMapper",
      map: (dto: any) => new AmazonSearchRuleCreateMapper().toCreateInput(dto),
      dto: { value: " sony " },
      expected: { value: "sony", categoryId: null, createdAt: NOW },
    },
    {
      name: "AmazonAdCreateMapper",
      map: (dto: any) => new AmazonAdCreateMapper().toCreateInput(dto),
      dto: { asin: "A1", name: "Drill", image: "img", categoryName: "tools" },
      expected: {
        asin: "A1",
        name: "Drill",
        matchesRules: null,
        image: "img",
        createdAt: NOW,
        updatedAt: NOW,
        category: {
          connectOrCreate: {
            where: { name: "tools" },
            create: { name: "tools", createdAt: NOW, updatedAt: NOW },
          },
        },
      },
    },
    {
      name: "AmazonAdPriceCreateMapper",
      map: (dto: any) => new AmazonAdPriceCreateMapper().toCreateInput(dto),
      dto: { value: 9.99, adId: 3, countryId: 4, dispatchFrom: "Amazon" },
      expected: {
        value: 9.99,
        dispatchFrom: "Amazon",
        country: { connect: { id: 4 } },
        ad: { connect: { id: 3 } },
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
    {
      name: "CountryCreateMapper",
      map: (dto: any) => new CountryCreateMapper().toCreateInput(dto),
      dto: { name: "Germany", code: "de", currencyId: 2 },
      expected: {
        name: "Germany",
        code: "de",
        currency: { connect: { id: 2 } },
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
    {
      name: "CurrencyCreateMapper",
      map: (dto: any) => new CurrencyCreateMapper().toCreateInput(dto),
      dto: { name: "Euro", code: "EUR", symbol: "€" },
      expected: {
        name: "Euro",
        code: "EUR",
        symbol: "€",
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
    {
      name: "CurrencyExchangeRateCreateMapper",
      map: (dto: any) =>
        new CurrencyExchangeRateCreateMapper().toCreateInput(dto),
      dto: { value: 4.3, sourceId: 1, targetId: 2 },
      expected: {
        value: 4.3,
        source: { connect: { id: 1 } },
        target: { connect: { id: 2 } },
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
  ])("$name maps dto to create input", ({ map, dto, expected }) => {
    expect(map(dto)).toStrictEqual(expected);
  });
});

describe("update mappers", () => {
  it.each([
    {
      name: "AmazonAdCategoryUpdateMapper",
      map: (dto: any) => new AmazonAdCategoryUpdateMapper().toUpdateInput(dto),
      dto: { name: "tools" },
      expected: { name: "tools", updatedAt: NOW },
    },
    {
      name: "AmazonSearchRuleUpdateMapper (clears the category)",
      map: (dto: any) => new AmazonSearchRuleUpdateMapper().toUpdateInput(dto),
      dto: { categoryId: null },
      expected: { value: undefined, categoryId: null },
    },
    {
      name: "AmazonSearchRuleUpdateMapper (keeps the category)",
      map: (dto: any) => new AmazonSearchRuleUpdateMapper().toUpdateInput(dto),
      dto: { value: "bose" },
      expected: { value: "bose", categoryId: undefined },
    },
    {
      name: "AmazonAdUpdateMapper",
      map: (dto: any) => new AmazonAdUpdateMapper().toUpdateInput(dto),
      dto: { categoryId: 1, name: "Drill", image: "img", prices: [] },
      expected: { name: "Drill", image: "img", updatedAt: NOW },
    },
    {
      name: "AmazonAdPriceUpdateMapper",
      map: (dto: any) => new AmazonAdPriceUpdateMapper().toUpdateInput(dto),
      dto: { value: 1.5, countryId: 1, adId: 2 },
      expected: { value: 1.5, updatedAt: NOW },
    },
    {
      name: "CountryUpdateMapper",
      map: (dto: any) => new CountryUpdateMapper().toUpdateInput(dto),
      dto: { name: "Germany", code: "de", currencyId: 2 },
      expected: {
        name: "Germany",
        code: "de",
        currency: { connect: { id: 2 } },
        updatedAt: NOW,
      },
    },
    {
      name: "CurrencyUpdateMapper",
      map: (dto: any) => new CurrencyUpdateMapper().toUpdateInput(dto),
      dto: { name: "Euro", code: "EUR", symbol: "€" },
      expected: { name: "Euro", code: "EUR", symbol: "€", updatedAt: NOW },
    },
    {
      name: "CurrencyExchangeRateUpdateMapper",
      map: (dto: any) =>
        new CurrencyExchangeRateUpdateMapper().toUpdateInput(dto),
      dto: { value: 4.3 },
      expected: { value: 4.3, updatedAt: NOW },
    },
  ])("$name maps dto to update input", ({ map, dto, expected }) => {
    expect(map(dto)).toStrictEqual(expected);
  });
});

describe("AmazonAdListingPriceMapper", () => {
  const mapper = new AmazonAdListingPriceMapper();

  it("marks only Amazon-dispatched prices as reportable", () => {
    const countryPrices = mapper.map([
      [
        buildPrice({ dispatchFrom: "Amazon" }),
        buildPrice({ dispatchFrom: "Seller" }),
      ],
      [buildPrice({ dispatchFrom: null })],
    ]);

    expect(
      countryPrices.map((prices) => prices.map((price) => price.reportable))
    ).toEqual([[true, false], [false]]);
  });

  it("copies value, createdAt, country fields and currency code", () => {
    const eur = buildCurrency({ code: "EUR" });
    const price = buildPrice({
      value: 12.5,
      createdAt: new Date("2026-02-03T04:05:06.000Z"),
      country: buildPriceCountry({
        name: "Germany",
        code: "de",
        active: false,
        currencyId: eur.id,
        currency: eur,
      }),
    });

    const countryPrices = mapper.map([[price]]);

    expect(countryPrices).toStrictEqual([
      [
        {
          value: price.value,
          createdAt: new Date("2026-02-03T04:05:06.000Z"),
          reportable: true,
          country: {
            name: "Germany",
            code: "de",
            active: false,
            currencyId: eur.id,
            currencyCode: "EUR",
          },
        },
      ],
    ]);
  });
});

describe("ScraperMetricCreateMapper", () => {
  it("maps every metric to a row and fills missing labels with null", () => {
    const rows = new ScraperMetricCreateMapper().toCreateInputs("amazon-pdp", {
      marketplace: "amazon",
      flow: "pdp",
      periodStart: "2026-10-18T10:00:00.000Z",
      metrics: [
        { metric: "requests", country: "de", outcome: "ok", value: 120 },
        { metric: "bytes_in", value: 1843200 },
      ],
    });

    const base = {
      scraper: "amazon-pdp",
      marketplace: "amazon",
      flow: "pdp",
      periodStart: new Date("2026-10-18T10:00:00.000Z"),
      createdAt: NOW,
    };
    expect(rows).toStrictEqual([
      { ...base, metric: "requests", country: "de", outcome: "ok", value: 120 },
      { ...base, metric: "bytes_in", country: null, outcome: null, value: 1843200 },
    ]);
  });
});

describe("AmazonSearchRule mappers", () => {
  it("reject an invalid rule with status 400", () => {
    expect(() =>
      new AmazonSearchRuleCreateMapper().toCreateInput({ value: "a++b" })
    ).toThrow(expect.objectContaining({ status: 400 }));
    expect(() =>
      new AmazonSearchRuleUpdateMapper().toUpdateInput({ value: "a++b" })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe("AmazonSearchRule mappers categoryId", () => {
  it("reject a non-integer categoryId with status 400", () => {
    expect(() =>
      new AmazonSearchRuleCreateMapper().toCreateInput({
        value: "sony",
        categoryId: "12" as any,
      })
    ).toThrow(expect.objectContaining({ status: 400 }));
    expect(() =>
      new AmazonSearchRuleUpdateMapper().toUpdateInput({ categoryId: 1.5 })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe("AmazonSearchRuleBatchMapper", () => {
  it("maps creates, updates and deletes", () => {
    expect(
      new AmazonSearchRuleBatchMapper().toBatchInput({
        create: [{ value: " sony ", categoryId: 2 }],
        update: [{ id: 3, categoryId: null }],
        delete: [4],
      })
    ).toEqual({
      create: [{ value: "sony", categoryId: 2, createdAt: NOW }],
      update: [{ id: 3, data: { value: undefined, categoryId: null } }],
      delete: [4],
    });
  });

  it("treats missing lists as empty", () => {
    expect(new AmazonSearchRuleBatchMapper().toBatchInput({})).toEqual({
      create: [],
      update: [],
      delete: [],
    });
  });

  it.each([
    ["a non-object body", null],
    ["a non-array list", { delete: 4 }],
    ["an invalid id", { delete: [0] }],
    ["an update without id", { update: [{ value: "sony" }] }],
    ["an invalid rule", { create: [{ value: "a +" }] }],
  ])("rejects %s with status 400", (_, dto) => {
    expect(() =>
      new AmazonSearchRuleBatchMapper().toBatchInput(dto as any)
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});
