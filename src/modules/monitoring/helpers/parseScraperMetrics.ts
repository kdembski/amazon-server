import {
  ScraperMetricDto,
  ScraperMetricsDto,
} from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { Marketplace } from "@prisma/client";

export class InvalidScraperMetricsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScraperMetricsError";
  }
}

const MAX_METRICS = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const requireString = (
  value: unknown,
  field: string,
  min: number,
  max: number
) => {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new InvalidScraperMetricsError(
      `${field} must be a string of ${min}-${max} characters`
    );
  }
  return value;
};

const optionalString = (value: unknown, field: string, max: number) =>
  value === undefined ? undefined : requireString(value, field, 0, max);

const isMarketplace = (value: unknown): value is Marketplace =>
  Object.values<unknown>(Marketplace).includes(value);

const MIN_PERIOD_START = Date.parse("1970-01-01T00:00:01.000Z");
const MAX_PERIOD_START = Date.parse("2038-01-19T03:14:07.000Z");

const isValidPeriodStart = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const time = Date.parse(value);
  return (
    !Number.isNaN(time) &&
    new Date(time).toISOString() === value &&
    time >= MIN_PERIOD_START &&
    time <= MAX_PERIOD_START
  );
};

const parseMetric = (item: unknown): ScraperMetricDto => {
  if (!isRecord(item)) {
    throw new InvalidScraperMetricsError("metrics must contain objects");
  }
  if (
    typeof item.value !== "number" ||
    !Number.isFinite(item.value) ||
    item.value < 0
  ) {
    throw new InvalidScraperMetricsError(
      "value must be a finite number >= 0"
    );
  }
  return {
    metric: requireString(item.metric, "metric", 1, 63),
    country: optionalString(item.country, "country", 7),
    outcome: optionalString(item.outcome, "outcome", 31),
    value: item.value,
  };
};

export function parseScraperMetrics(body: unknown): ScraperMetricsDto {
  if (!isRecord(body)) {
    throw new InvalidScraperMetricsError("body must be an object");
  }
  const { marketplace, flow, periodStart, metrics } = body;
  if (!isMarketplace(marketplace)) {
    throw new InvalidScraperMetricsError(
      `marketplace must be one of: ${Object.values(Marketplace).join(", ")}`
    );
  }
  if (!isValidPeriodStart(periodStart)) {
    throw new InvalidScraperMetricsError(
      "periodStart must be an ISO 8601 UTC timestamp between 1970-01-01T00:00:01.000Z and 2038-01-19T03:14:07.000Z"
    );
  }
  if (!Array.isArray(metrics) || metrics.length > MAX_METRICS) {
    throw new InvalidScraperMetricsError(
      `metrics must be an array of at most ${MAX_METRICS} items`
    );
  }
  return {
    marketplace,
    flow: requireString(flow, "flow", 1, 15),
    periodStart,
    metrics: metrics.map(parseMetric),
  };
}
