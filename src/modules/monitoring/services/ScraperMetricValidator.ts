import { Marketplace } from "@prisma/client";
import {
  ScraperBreakdownKey,
  ScraperMetricDto,
  ScraperMetricsDto,
} from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { HttpError } from "@/shared/http/HttpError";

const MAX_METRICS = 1000;
const BREAKDOWN_KEYS: unknown[] = ["country", "flow"];
const MIN_PERIOD_START = Date.parse("1970-01-01T00:00:01.000Z");
const MAX_PERIOD_START = Date.parse("2038-01-19T03:14:07.000Z");

export class ScraperMetricValidator {
  validateName(name: string) {
    if (name.length < 1 || name.length > 63) {
      throw new HttpError(400, "scraper name must be a string of 1-63 characters");
    }
    return name;
  }

  validateBreakdownKey(value: unknown): ScraperBreakdownKey {
    if (!BREAKDOWN_KEYS.includes(value)) {
      throw new HttpError(400, "by must be one of: country, flow");
    }
    return value as ScraperBreakdownKey;
  }

  validateMetrics(body: unknown): ScraperMetricsDto {
    if (!this.isRecord(body)) {
      throw new HttpError(400, "body must be an object");
    }
    const { marketplace, flow, periodStart, metrics } = body;
    if (!this.isMarketplace(marketplace)) {
      throw new HttpError(400, `marketplace must be one of: ${Object.values(Marketplace).join(", ")}`);
    }
    if (!this.isValidPeriodStart(periodStart)) {
      throw new HttpError(
        400,
        "periodStart must be an ISO 8601 UTC timestamp between 1970-01-01T00:00:01.000Z and 2038-01-19T03:14:07.000Z"
      );
    }
    if (!Array.isArray(metrics) || metrics.length > MAX_METRICS) {
      throw new HttpError(400, `metrics must be an array of at most ${MAX_METRICS} items`);
    }
    return {
      marketplace,
      flow: this.requireString(flow, "flow", 1, 15),
      periodStart,
      metrics: metrics.map((item) => this.validateMetric(item)),
    };
  }

  private validateMetric(item: unknown): ScraperMetricDto {
    if (!this.isRecord(item)) {
      throw new HttpError(400, "metrics must contain objects");
    }
    if (typeof item.value !== "number" || !Number.isFinite(item.value) || item.value < 0) {
      throw new HttpError(400, "value must be a finite number >= 0");
    }
    return {
      metric: this.requireString(item.metric, "metric", 1, 63),
      country: this.optionalString(item.country, "country", 7),
      outcome: this.optionalString(item.outcome, "outcome", 31),
      value: item.value,
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private requireString(value: unknown, field: string, min: number, max: number) {
    if (typeof value !== "string" || value.length < min || value.length > max) {
      throw new HttpError(400, `${field} must be a string of ${min}-${max} characters`);
    }
    return value;
  }

  private optionalString(value: unknown, field: string, max: number) {
    return value === undefined ? undefined : this.requireString(value, field, 0, max);
  }

  private isMarketplace(value: unknown): value is Marketplace {
    return Object.values<unknown>(Marketplace).includes(value);
  }

  private isValidPeriodStart(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const time = Date.parse(value);
    return (
      !Number.isNaN(time) &&
      new Date(time).toISOString() === value &&
      time >= MIN_PERIOD_START &&
      time <= MAX_PERIOD_START
    );
  }
}
