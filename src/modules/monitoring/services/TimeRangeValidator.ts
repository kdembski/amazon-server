import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";
import { HttpError } from "@/shared/http/HttpError";

const MAX_RANGE_MS = 30 * 86_400_000;

export class TimeRangeValidator {
  validate(query: unknown): TimeRange {
    const { from, to } = (query ?? {}) as Record<string, unknown>;
    if (typeof from !== "string" || typeof to !== "string") {
      throw this.invalid();
    }

    const range = { from: new Date(from), to: new Date(to) };
    const length = range.to.getTime() - range.from.getTime();
    if (!(length > 0 && length <= MAX_RANGE_MS)) {
      throw this.invalid();
    }
    return range;
  }

  private invalid() {
    return new HttpError(400, "from and to must be ISO dates with from < to and at most 30 days apart");
  }
}
