const MAX_RANGE_MS = 30 * 86_400_000;

export interface TimeRange {
  from: Date;
  to: Date;
}

export class InvalidTimeRangeError extends Error {
  status = 400;

  constructor() {
    super("from and to must be ISO dates with from < to and at most 30 days apart");
    this.name = "InvalidTimeRangeError";
  }
}

export function parseTimeRange(query: unknown): TimeRange {
  const { from, to } = (query ?? {}) as Record<string, unknown>;
  if (typeof from !== "string" || typeof to !== "string") {
    throw new InvalidTimeRangeError();
  }

  const range = { from: new Date(from), to: new Date(to) };
  const length = range.to.getTime() - range.from.getTime();
  if (!(length > 0 && length <= MAX_RANGE_MS)) {
    throw new InvalidTimeRangeError();
  }
  return range;
}

export function previousRange({ from, to }: TimeRange): TimeRange {
  return { from: new Date(2 * from.getTime() - to.getTime()), to: from };
}

export function toHourIso(epochSeconds: number | bigint) {
  return new Date(Number(epochSeconds) * 1000).toISOString();
}
