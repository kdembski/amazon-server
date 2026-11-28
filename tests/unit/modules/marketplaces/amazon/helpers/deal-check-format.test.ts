import { describe, expect, it } from "vitest";
import {
  getProfitField,
  getSaleField,
  getSearchLinks,
} from "@/modules/marketplaces/amazon/helpers/deal-check-format";

const answer = (overrides: object = {}) => ({
  verdict: "KUPUJ",
  query: "bosch",
  attributes: "",
  price: [289, 299.9],
  estimate: [280],
  profit: 167.81,
  sale: 289,
  cost: 89.4,
  roi: 187.7,
  commission: 11,
  ...overrides,
});

const empty = { price: [], estimate: [], profit: null, sale: null, cost: null, roi: null, commission: null };

describe("deal-check-format", () => {
  it("builds the Allegro listing sorted by price and the Google search links with the encoded query", () => {
    expect(getSearchLinks(" Bateria [AA] (4) ")).toBe(
      "[Allegro](https://allegro.pl/listing?string=Bateria+%5BAA%5D+%284%29&order=p) · " +
        "[Google](https://www.google.com/search?q=Bateria+%5BAA%5D+%284%29)"
    );
  });

  it.each([
    [{}, "**289.00 zł**\n-# 289.00 – 299.90 zł, 280.00 zł\\*"],
    [{ price: [10, 10], estimate: [] }, "**289.00 zł**\n-# 10.00 zł"],
    [{ sale: null, price: [] }, "-# 280.00 zł\\*"],
    [{ price: [], estimate: [] }, "**289.00 zł**"],
  ])("builds the inline sale field of %j", (overrides, value) => {
    expect(getSaleField(answer(overrides))).toEqual([{ name: "Wycena", value, inline: true }]);
  });

  it.each([
    [{}, "**+167.81 zł**\n-# ROI: 188%, prowizja: 11%"],
    [{ profit: -5, roi: -12, commission: null }, "**-5.00 zł**\n-# ROI: -12%"],
  ])("builds the inline profit field of %j", (overrides, value) => {
    expect(getProfitField(answer(overrides))).toEqual([{ name: "Zysk", value, inline: true }]);
  });

  it("leaves out the fields without numbers", () => {
    expect([...getSaleField(answer(empty)), ...getProfitField(answer(empty))]).toEqual([]);
  });
});
