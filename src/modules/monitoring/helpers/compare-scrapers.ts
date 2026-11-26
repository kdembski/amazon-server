const rank = (name: string) => {
  if (name.includes("pdp")) return 0;
  if (name.includes("plp")) return 2;
  return 1;
};

// PDP scrapers first, PLP scrapers last, numbered ones in numeric order (pdp-2 before pdp-10).
// Other names, like the country codes of the same series, stay alphabetical.
export const compareScrapers = (a: string, b: string) => {
  return rank(a) - rank(b) || a.localeCompare(b, "en", { numeric: true });
};
