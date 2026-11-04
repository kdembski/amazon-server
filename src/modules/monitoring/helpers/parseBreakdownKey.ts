import { ScraperBreakdownKey } from "@/modules/monitoring/dtos/ScraperMetricDtos";

const KEYS: unknown[] = ["country", "flow"];

export class InvalidBreakdownKeyError extends Error {
  status = 400;

  constructor() {
    super("by must be one of: country, flow");
    this.name = "InvalidBreakdownKeyError";
  }
}

export function parseBreakdownKey(value: unknown): ScraperBreakdownKey {
  if (!KEYS.includes(value)) {
    throw new InvalidBreakdownKeyError();
  }
  return value as ScraperBreakdownKey;
}
