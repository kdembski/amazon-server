import { describe, expect, it } from "vitest";
import {
  getListingLink,
  getPriceRange,
  getProfitLine,
} from "@/modules/marketplaces/amazon/helpers/deal-check-format";

describe("deal-check-format", () => {
  it("builds an Allegro listing link sorted by price with an escaped label", () => {
    expect(getListingLink(" Bateria [AA] (4) ")).toBe(
      "[Bateria (AA) (4)](https://allegro.pl/listing?string=Bateria+%5BAA%5D+%284%29&order=p)"
    );
  });

  it.each([
    [289, 299.9, "289.00 – 299.90 zł"],
    [10, 10, "10.00 zł"],
    [10, null, "10.00 zł"],
    [null, null, "brak cen w wynikach wyszukiwania"],
  ])("formats the price range %s–%s", (min, max, expected) => {
    expect(getPriceRange(min, max)).toBe(expected);
  });

  it("formats the profit numbers and leaves out the null ones", () => {
    const line = getProfitLine({ profit: 167.81, sale: null, cost: 89.4, roi: 187.7, commission: 11 });

    expect(line).toBe(
      ["Zysk **167.81 zł**", "Koszt 89.40 zł", "ROI 188%", "Prowizja 11%"].join(" · ")
    );
  });

  it("returns an empty line without numbers", () => {
    expect(getProfitLine({ profit: null, sale: null, cost: null, roi: null, commission: null })).toBe("");
  });
});
