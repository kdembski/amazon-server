import { PrismaClient } from "@@prisma/PrismaClient";

// tests/integration/env.ts must be evaluated before this module.
export const prisma = PrismaClient.getInstance();

export const TABLES = [
  "AmazonAdPrice",
  "AmazonAd",
  "AmazonExclusionRule",
  "AmazonAdCategory",
  "Country",
  "Currency",
  "CurrencyExchangeRate",
  "ActivityEvent",
  "ScraperMetric",
] as const;

// FOREIGN_KEY_CHECKS is per session, so every statement has to run on the one
// connection a batch $transaction holds. TRUNCATE also resets AUTO_INCREMENT.
export function truncateAll() {
  return prisma.$transaction([
    prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0"),
    ...TABLES.map((table) =>
      prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``)
    ),
    prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1"),
  ]);
}
