import { inject } from "vitest";

process.env.DATABASE_URL = inject("databaseUrl");
process.env.DISCORD_LOGS_TOKEN = "logs-token";
process.env.DISCORD_PRICING_ERROR_TOKEN = "pricing-token";
for (const channel of [1, 2, 3, 4, 5, 6]) {
  process.env[`DISCORD_CONVERSION_ERROR_${channel}_TOKEN`] =
    `conversion-${channel}-token`;
}
process.env.API_TOKEN = "api-token";
