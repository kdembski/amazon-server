import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogCreateMapper } from "@/modules/monitoring/mappers/LogCreateMapper";
import { AmazonAdCategoryCreateMapper } from "@/mappers/amazon/AmazonAdCategoryCreateMapper";
import { AmazonAdCategoryUpdateMapper } from "@/mappers/amazon/AmazonAdCategoryUpdateMapper";
import { AmazonAdCreateMapper } from "@/mappers/amazon/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/mappers/amazon/AmazonAdUpdateMapper";
import { AmazonAdPriceCreateMapper } from "@/mappers/amazon/AmazonAdPriceCreateMapper";
import { AmazonAdPriceUpdateMapper } from "@/mappers/amazon/AmazonAdPriceUpdateMapper";
import { CountryCreateMapper } from "@/modules/currency/mappers/CountryCreateMapper";
import { CountryUpdateMapper } from "@/modules/currency/mappers/CountryUpdateMapper";
import { CurrencyCreateMapper } from "@/modules/currency/mappers/CurrencyCreateMapper";
import { CurrencyUpdateMapper } from "@/modules/currency/mappers/CurrencyUpdateMapper";
import { CurrencyExchangeRateCreateMapper } from "@/modules/currency/mappers/CurrencyExchangeRateCreateMapper";
import { CurrencyExchangeRateUpdateMapper } from "@/modules/currency/mappers/CurrencyExchangeRateUpdateMapper";

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
      name: "LogCreateMapper",
      map: (dto: any) => new LogCreateMapper().toCreateInput(dto),
      dto: { event: "ad_scraped", data: "x" },
      expected: { event: "ad_scraped", data: "x", createdAt: NOW },
    },
    {
      name: "AmazonAdCategoryCreateMapper",
      map: (dto: any) => new AmazonAdCategoryCreateMapper().toCreateInput(dto),
      dto: { name: "tools" },
      expected: { name: "tools", createdAt: NOW, updatedAt: NOW },
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
