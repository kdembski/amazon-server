import { HttpError } from "@/shared/http/HttpError";

export const PDP_SOURCES = ["aod", "twister", "awd"];
export const MIN_ROUTE_ATTEMPTS = 2;
export const MAX_ROUTE_ATTEMPTS = 20;
const MAX_PROXY_TYPE_LENGTH = 15;

export class AmazonCountryRouteValidator {
  validateCountryId(countryId: unknown) {
    if (!Number.isInteger(countryId) || (countryId as number) < 1) {
      throw new HttpError(400, `Route countryId ${JSON.stringify(countryId)} must be a positive integer`);
    }
    return countryId as number;
  }

  validatePriority(priority: unknown) {
    if (!Number.isInteger(priority)) {
      throw new HttpError(400, `Route priority ${JSON.stringify(priority)} must be an integer`);
    }
    return priority as number;
  }

  validateProxyType(proxyType: unknown) {
    if (typeof proxyType !== "string" || !proxyType || proxyType.length > MAX_PROXY_TYPE_LENGTH) {
      throw new HttpError(400, `Route proxyType must be a string of 1-${MAX_PROXY_TYPE_LENGTH} characters`);
    }
    return proxyType;
  }

  validatePdpSource(pdpSource: unknown) {
    if (!PDP_SOURCES.includes(pdpSource as string)) {
      throw new HttpError(400, `Route pdpSource ${JSON.stringify(pdpSource)} must be one of ${PDP_SOURCES.join(", ")}`);
    }
    return pdpSource as string;
  }

  validateMaxAttempts(maxAttempts: unknown) {
    const valid =
      Number.isInteger(maxAttempts) &&
      (maxAttempts as number) >= MIN_ROUTE_ATTEMPTS &&
      (maxAttempts as number) <= MAX_ROUTE_ATTEMPTS;
    if (!valid) {
      throw new HttpError(
        400,
        `Route maxAttempts ${JSON.stringify(maxAttempts)} must be an integer from ${MIN_ROUTE_ATTEMPTS} to ${MAX_ROUTE_ATTEMPTS}`
      );
    }
    return maxAttempts as number;
  }
}
