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
  if (!Object.values(Marketplace).includes(marketplace as Marketplace)) {
    throw new InvalidScraperMetricsError(
      `marketplace must be one of: ${Object.values(Marketplace).join(", ")}`
    );
  }
  if (
    typeof periodStart !== "string" ||
    Number.isNaN(new Date(periodStart).getTime())
  ) {
    throw new InvalidScraperMetricsError("periodStart must be an ISO date");
  }
  if (!Array.isArray(metrics) || metrics.length > MAX_METRICS) {
    throw new InvalidScraperMetricsError(
      `metrics must be an array of at most ${MAX_METRICS} items`
    );
  }
  return {
    marketplace: marketplace as string,
    flow: requireString(flow, "flow", 1, 15),
    periodStart,
    metrics: metrics.map(parseMetric),
  };
}
