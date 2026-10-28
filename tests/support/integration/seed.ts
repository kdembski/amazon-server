import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { FIXED_DATE } from "../factories";

let seq = 0;
const next = () => ++seq;
const stamps = (at: Date = FIXED_DATE) => ({ createdAt: at, updatedAt: at });

export function seedCurrency(
  overrides: Partial<Prisma.CurrencyUncheckedCreateInput> = {}
) {
  const n = next();
  return prisma.currency.create({
    data: {
      name: `Currency ${n}`,
      code: `CUR${n}`,
      symbol: "¤",
      ...stamps(),
      ...overrides,
    },
  });
}

export async function seedCountry(
  overrides: Partial<Prisma.CountryUncheckedCreateInput> = {}
) {
  const n = next();
  const currencyId = overrides.currencyId ?? (await seedCurrency()).id;
  return prisma.country.create({
    data: {
      name: `Country ${n}`,
      code: `c${n}`,
      ...stamps(),
      ...overrides,
      currencyId,
    },
  });
}

export async function seedAmazonCountry(
  overrides: Partial<Prisma.AmazonCountryUncheckedCreateInput> = {}
) {
  const countryId = overrides.countryId ?? (await seedCountry()).id;
  return prisma.amazonCountry.create({
    data: {
      tld: "pl",
      scraped: true,
      active: true,
      proxyType: "datacenter",
      pdpSource: "aod",
      priority: 0,
      ...stamps(),
      ...overrides,
      countryId,
    },
  });
}

export function seedCategory(
  overrides: Partial<Prisma.AmazonAdCategoryUncheckedCreateInput> = {}
) {
  const n = next();
  return prisma.amazonAdCategory.create({
    data: {
      name: `category-${n}`,
      active: true,
      scrapedAt: null,
      ...stamps(),
      ...overrides,
    },
  });
}

export async function seedAd(
  overrides: Partial<Prisma.AmazonAdUncheckedCreateInput> = {}
) {
  const n = next();
  const categoryId = overrides.categoryId ?? (await seedCategory()).id;
  return prisma.amazonAd.create({
    data: {
      asin: `B0SEED${String(n).padStart(4, "0")}`,
      name: `Product ${n}`,
      image: `https://images.example/${n}.jpg`,
      scrapedAt: null,
      ...stamps(),
      ...overrides,
      categoryId,
    },
  });
}

export async function seedPrice(
  overrides: Partial<Prisma.AmazonAdPriceUncheckedCreateInput> = {}
) {
  const adId = overrides.adId ?? (await seedAd()).id;
  const countryId =
    overrides.countryId ?? (await seedAmazonCountry()).countryId;
  return prisma.amazonAdPrice.create({
    data: {
      value: 100,
      dispatchFrom: "Amazon",
      ...stamps(),
      ...overrides,
      adId,
      countryId,
    },
  });
}

export async function seedRate(
  overrides: Partial<Prisma.CurrencyExchangeRateUncheckedCreateInput> = {}
) {
  const sourceId = overrides.sourceId ?? (await seedCurrency()).id;
  const targetId = overrides.targetId ?? (await seedCurrency()).id;
  return prisma.currencyExchangeRate.create({
    data: { value: 4.3, ...stamps(), ...overrides, sourceId, targetId },
  });
}

export function seedAmazonExclusionRule(
  overrides: Partial<Prisma.AmazonExclusionRuleUncheckedCreateInput> = {}
) {
  const n = next();
  return prisma.amazonExclusionRule.create({
    data: { value: `rule-${n}`, createdAt: FIXED_DATE, ...overrides },
  });
}

export function seedActivityEvent(
  overrides: Partial<Prisma.ActivityEventUncheckedCreateInput> = {}
) {
  return prisma.activityEvent.create({
    data: {
      type: "ad_scraped",
      marketplace: "amazon",
      data: { asin: "B000SEED00" },
      createdAt: FIXED_DATE,
      ...overrides,
    },
  });
}

export function seedScraperMetric(
  overrides: Partial<Prisma.ScraperMetricUncheckedCreateInput> = {}
) {
  return prisma.scraperMetric.create({
    data: {
      scraper: "amazon-pdp",
      marketplace: "amazon",
      flow: "pdp",
      metric: "requests",
      value: 1,
      periodStart: FIXED_DATE,
      createdAt: FIXED_DATE,
      ...overrides,
    },
  });
}

export function seedPln() {
  return prisma.currency.upsert({
    where: { code: "PLN" },
    update: {},
    create: { name: "Polish zloty", code: "PLN", symbol: "zł", ...stamps() },
  });
}

// Currency + country with its Amazon country + (optionally) the currency's rate to PLN.
export async function seedMarket(options: {
  countryCode: string;
  currencyCode: string;
  rateToPln?: number;
  active?: boolean;
}) {
  const pln = await seedPln();
  const currency =
    options.currencyCode === "PLN"
      ? pln
      : await seedCurrency({ code: options.currencyCode });
  const country = await seedCountry({
    code: options.countryCode,
    currencyId: currency.id,
  });
  await seedAmazonCountry({
    countryId: country.id,
    tld: options.countryCode,
    active: options.active ?? true,
  });
  const rate =
    options.rateToPln === undefined
      ? null
      : await seedRate({
          sourceId: currency.id,
          targetId: pln.id,
          value: options.rateToPln,
        });
  return { pln, currency, country, rate };
}
