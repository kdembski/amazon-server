export class InvalidScraperNameError extends Error {
  status = 400;

  constructor() {
    super("scraper name must be a string of 1-63 characters");
    this.name = "InvalidScraperNameError";
  }
}

export function assertScraperName(name: string) {
  if (name.length < 1 || name.length > 63) {
    throw new InvalidScraperNameError();
  }
}
