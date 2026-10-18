import { Decimal } from "@prisma/client/runtime/library";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { AmazonAdCategorySelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdCategoryDtos";
import { CurrencySelectDto } from "@/modules/currency/dtos/CurrencyDtos";
import { CurrencyExchangeRateSelectDto } from "@/modules/currency/dtos/CurrencyExchangeRateDtos";
import { SearchRuleSelectDto } from "@/modules/search-rules/dtos/SearchRuleDtos";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export const FIXED_DATE = new Date("2026-01-01T12:00:00.000Z");

let seq = 0;
const nextId = () => ++seq;

export const buildCurrency = (
  overrides: Partial<CurrencySelectDto> = {}
): CurrencySelectDto => ({
  id: nextId(),
  name: "Polish zloty",
  code: "PLN",
  symbol: "zł",
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  ...overrides,
});

export const buildCategory = (
  overrides: Partial<AmazonAdCategorySelectDto> = {}
): AmazonAdCategorySelectDto => ({
  id: nextId(),
  name: "electronics",
  active: true,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  scrapedAt: null,
  ...overrides,
});

export const buildAd = (
  overrides: Partial<AmazonAdSelectDto> = {}
): AmazonAdSelectDto => {
  const { category, ...rest } = overrides;
  const built = buildCategory();
  const resolvedCategory = category ?? {
    id: built.id,
    name: built.name,
    active: built.active,
  };
  return {
    id: nextId(),
    asin: "B0TESTASIN",
    image: "https://images.example/1.jpg",
    name: "Sony WH-1000XM5",
    categoryId: resolvedCategory.id,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    scrapedAt: null,
    category: resolvedCategory,
    ...rest,
  };
};

type PriceCountry = AmazonAdPriceSelectDto["country"];

export const buildPriceCountry = (
  overrides: Partial<PriceCountry> = {}
): PriceCountry => {
  const currency = buildCurrency();
  return {
    id: nextId(),
    name: "Poland",
    code: "pl",
    currencyId: currency.id,
    currency,
    active: true,
    ...overrides,
  };
};

type PriceOverrides = Partial<Omit<AmazonAdPriceSelectDto, "value">> & {
  value?: number | Decimal;
};

export const buildPrice = (
  overrides: PriceOverrides = {}
): AmazonAdPriceSelectDto => {
  const { value, country, ...rest } = overrides;
  const resolvedCountry = country ?? buildPriceCountry();
  return {
    id: nextId(),
    adId: 1,
    countryId: resolvedCountry.id,
    value: new Decimal(value ?? 100),
    dispatchFrom: "Amazon",
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    country: resolvedCountry,
    ...rest,
  };
};

type ListingPriceOverrides = Partial<
  Omit<ListingPrice, "value" | "country">
> & {
  value?: number | Decimal;
  country?: Partial<ListingPrice["country"]>;
};

export const buildListingPrice = (
  overrides: ListingPriceOverrides = {}
): ListingPrice => {
  const { value, country, ...rest } = overrides;
  return {
    value: new Decimal(value ?? 100),
    createdAt: FIXED_DATE,
    reportable: true,
    country: {
      name: "Poland",
      code: "pl",
      active: true,
      currencyId: 1,
      currencyCode: "PLN",
      ...country,
    },
    ...rest,
  };
};

type RateOverrides = Partial<Omit<CurrencyExchangeRateSelectDto, "value">> & {
  value?: number | Decimal;
};

export const buildRate = (
  overrides: RateOverrides = {}
): CurrencyExchangeRateSelectDto => {
  const { value, source, target, ...rest } = overrides;
  const resolvedSource =
    source ?? buildCurrency({ code: "EUR", name: "Euro", symbol: "€" });
  const resolvedTarget = target ?? buildCurrency();
  return {
    id: nextId(),
    sourceId: resolvedSource.id,
    targetId: resolvedTarget.id,
    value: new Decimal(value ?? 4.3),
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    source: resolvedSource,
    target: resolvedTarget,
    ...rest,
  };
};

export const buildSearchRule = (
  overrides: Partial<SearchRuleSelectDto> = {}
): SearchRuleSelectDto => ({
  id: nextId(),
  value: "refurbished",
  createdAt: FIXED_DATE,
  ...overrides,
});
