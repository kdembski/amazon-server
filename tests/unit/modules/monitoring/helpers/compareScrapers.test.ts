import { describe, expect, it } from "vitest";
import { compareScrapers } from "@/modules/monitoring/helpers/compareScrapers";

describe("compareScrapers", () => {
  it("puts PDP scrapers first, PLP scrapers last and the others between them", () => {
    const names = ["amazon-plp-1", "amazon-new-releases", "amazon-pdp-1", "aliexpress-plp"];

    expect(names.sort(compareScrapers)).toEqual([
      "amazon-pdp-1",
      "amazon-new-releases",
      "aliexpress-plp",
      "amazon-plp-1",
    ]);
  });

  it("orders numbered scrapers numerically", () => {
    expect(["amazon-pdp-10", "amazon-pdp-2", "amazon-pdp-1"].sort(compareScrapers)).toEqual([
      "amazon-pdp-1",
      "amazon-pdp-2",
      "amazon-pdp-10",
    ]);
  });

  it("keeps country codes alphabetical", () => {
    expect(["pl", "de", "it"].sort(compareScrapers)).toEqual(["de", "it", "pl"]);
  });
});
