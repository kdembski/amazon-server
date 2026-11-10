export interface AmazonCountryRouteCreateDto {
  countryId: number;
  priority: number;
  proxyType: string;
  pdpSource: string;
  maxAttempts: number;
}

export interface AmazonCountryRouteUpdateDto {
  priority: number;
  proxyType: string;
  pdpSource: string;
  maxAttempts: number;
}
